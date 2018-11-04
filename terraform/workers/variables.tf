variable "cluster_name" {
  type        = "string"
  description = "The name of the EKS cluster"
}

variable "security_group_id" {
  type        = "string"
  description = "The security group ID to associate with worker nodes in the cluster"
}

variable "cluster_endpoint" {
  type        = "string"
  description = "The EKS cluster endpoint"
}

variable "cluster_certificate_authority" {
  type        = "string"
  description = "The EKS cluster certificate authority"
}

variable "cluster_min_size" {
  type        = "string"
  description = "The minimum number of worker nodes"
}

variable "cluster_max_size" {
  type        = "string"
  description = "The maximum number of worker nodes"
}

variable "cluster_desired_size" {
  type        = "string"
  description = "The desired number of worker nodes"
}

variable "cluster_node_instance_type" {
  type        = "string"
  description = "EC2 instance type for cluster worker node"
}

variable "subnet_ids" {
  type        = "list"
  description = "The VPC subnet IDs"
}
