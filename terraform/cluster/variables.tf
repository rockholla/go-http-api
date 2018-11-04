variable "cluster_name" {
  type        = "string"
  description = "The name of the EKS cluster"
}

variable "security_group_id" {
  type        = "string"
  description = "The security group ID for the cluster masters, control plane"
}

variable "subnet_ids" {
  type        = "list"
  description = "The list of subnet IDs for the cluster network"
}
