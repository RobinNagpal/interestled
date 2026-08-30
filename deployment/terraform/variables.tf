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

variable "database_url" {
  description = <<-EOT
    Postgres connection string for the API Lambda. May be left empty at first
    apply — the function's environment is in `ignore_changes`, so a value set
    later in the AWS console (or via `aws lambda update-function-configuration`)
    survives future applies.
  EOT
  type        = string
  default     = ""
  sensitive   = true
}

variable "lambda_memory_mb" {
  description = "Memory for the API Lambda (CPU scales with it)."
  type        = number
  default     = 1024
}

variable "lambda_timeout_seconds" {
  description = <<-EOT
    Generating a knowledge map is a single large model call and routinely takes
    20-40 seconds, so the default 15s used for ordinary CRUD is far too short.
  EOT
  type        = number
  default     = 120
}

variable "llm_provider" {
  description = "Which LLM the API generates content with. Only \"gemini\" is implemented today."
  type        = string
  default     = "gemini"
}

variable "llm_model" {
  description = "Model id for the chosen provider."
  type        = string
  default     = "gemini-2.0-flash"
}

variable "llm_api_key" {
  description = <<-EOT
    API key for the chosen provider. Like database_url this may be left empty at
    first apply and set later, because the function's environment block is in
    `ignore_changes`.
  EOT
  type        = string
  default     = ""
  sensitive   = true
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
