# Cards read aloud: the bucket the recordings live in, and the IAM user the API
# writes them with.
#
# Separate from the web bucket on purpose. That one is a build artifact — the
# deploy syncs it with --delete and it can be destroyed and re-made — and this
# one is generated content that cost money to produce and cannot be rebuilt
# from the repository. They also have different readers: CloudFront reads the
# web bucket through an Origin Access Control, and nothing reads this one
# except a browser holding a link the API signed.

resource "aws_s3_bucket" "audio" {
  bucket = "${var.app_name}-audio-${data.aws_caller_identity.current.account_id}"

  # No force_destroy, unlike the web bucket. Everything in here is a model call
  # somebody paid for and a learner has listened to; `terraform destroy` should
  # stop rather than silently take it with the rest of the stack.
}

# Nothing here is public. A recording is one learner's card read out, and the
# only way to it is a link the API signs for an hour at a time.
resource "aws_s3_bucket_public_access_block" "audio" {
  bucket = aws_s3_bucket.audio.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# A media element plays a cross-origin file without asking permission, so this
# is not what makes the player work — it is what stops a fetch of the same URL
# failing later for a reason nobody would think to look for.
resource "aws_s3_bucket_cors_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://${var.domain_name}", "http://localhost:7070"]
    allowed_headers = ["*"]
    expose_headers  = ["Content-Length", "Content-Type", "Accept-Ranges"]
    max_age_seconds = 3600
  }
}

# A recording is only ever of one writing of one card, and a rewrite overwrites
# its own object — so what accumulates here is objects whose card has since been
# written at other settings, plus everything a bumped NARRATION_PROMPT_REVISION
# left behind. Old versions are what a rewrite replaces, so nothing is kept.
resource "aws_s3_bucket_lifecycle_configuration" "audio" {
  bucket = aws_s3_bucket.audio.id

  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# The API's own credentials, which are deliberately not the deployer's: the
# deployer can write the web bucket and invalidate the distribution, and this
# user can put and get objects in the audio bucket and nothing else. The API
# runs on a host shared with another application, so the blast radius of the
# key on that box is worth keeping this small.
resource "aws_iam_user" "api" {
  name = "${var.app_name}-api"
  path = "/${var.app_name}/"
}

data "aws_iam_policy_document" "api" {
  statement {
    sid = "AudioObjects"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
    ]
    resources = ["${aws_s3_bucket.audio.arn}/*"]
  }
}

resource "aws_iam_user_policy" "api" {
  name   = "${var.app_name}-audio"
  user   = aws_iam_user.api.name
  policy = data.aws_iam_policy_document.api.json
}

resource "aws_iam_access_key" "api" {
  count = var.create_deployer_access_key ? 1 : 0
  user  = aws_iam_user.api.name
}
