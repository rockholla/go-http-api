variable "cluster_name" {
  type        = "string"
  description = "The name of the EKS cluster"
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
