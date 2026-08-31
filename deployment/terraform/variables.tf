variable "app_name" {
  description = "Prefix for every resource name."
  type        = string
  default     = "interestled"
}

variable "aws_region" {
  description = "Region for the Lambda function and S3 bucket."
  type        = string
  default     = "us-east-1"
}

variable "domain_name" {
  description = <<-EOT
    Apex domain, which must ALREADY have a Route 53 hosted zone in this account
    — the certificate is DNS-validated against it. No default on purpose: a
    wrong value here fails ten minutes into the first apply.

    For this project: interestled.com
  EOT
  type        = string
}

variable "shared_host_state_bucket" {
  description = <<-EOT
    Terraform state bucket of the shared Lightsail host, read to find the
    instance's static IP. The host is shared with courtpot and its stack lives
    in that repository at deployment/terraform/shared-host, so its state belongs
    to neither project's bucket.

    Nothing about the database or the LLM appears in this stack any more. The
    API is a process on that host and its environment — DATABASE_URL,
    LLM_PROVIDER, LLM_MODEL, GEMINI_API_KEY — is written to
    /etc/interestled-api.env by the deploy workflow from repository secrets.
    That also removes the footgun the old `set_environment_command` output
    existed to warn about: a file is edited key by key, where
    `aws lambda update-function-configuration --environment` replaced the whole
    map and would silently drop the provider key.
  EOT
  type        = string
  default     = "shared-host-tfstate-729763663166"
}

variable "create_deployer_access_key" {
  description = <<-EOT
    Create an access key for the CI deployer user and expose it as (sensitive)
    outputs. Set to false if you prefer to mint the key yourself in the IAM
    console; the key created here is also stored in the terraform state.
  EOT
  type        = bool
  default     = true
}
