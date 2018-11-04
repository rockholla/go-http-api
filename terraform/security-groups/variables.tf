variable "cluster_name" {
  type        = "string"
  description = "The EKS cluster name used in security group naming as well"
}

variable "vpc_id" {
  type        = "string"
  description = "the AWS VPC ID"
}
