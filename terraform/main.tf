terraform {
  required_version = "~> 0.11.10"

  backend "s3" {
    # this config is set dynamically at runtime init
  }
}

provider "aws" {
  version = "~> 1.42"
  # this reset of this config is set dynamically at runtime
}

module "network" {
  source    = "./network"
  name      = "${var.cluster_name}"
}

module "security_groups" {
  source              = "./security-groups"
  cluster_name        = "${var.cluster_name}"
  vpc_id              = "${module.network.vpc_id}"
}

module "cluster" {
  source              = "./cluster"
  cluster_name        = "${var.cluster_name}"
  security_group_id   = "${module.security_groups.cluster_group_id}"
  subnet_ids          = "${module.network.subnet_ids}"
}

module "workers" {
  source                          = "./workers"
  cluster_name                    = "${var.cluster_name}"
  security_group_id               = "${module.security_groups.nodes_group_id}"
  cluster_endpoint                = "${module.cluster.endpoint}"
  cluster_certificate_authority   = "${module.cluster.certificate_authority_data}"
  cluster_min_size                = "${var.cluster_min_size}"
  cluster_max_size                = "${var.cluster_max_size}"
  cluster_desired_size            = "${var.cluster_desired_size}"
  cluster_node_instance_type      = "${var.cluster_node_instance_type}"
  subnet_ids                      = "${module.network.subnet_ids}"
}
