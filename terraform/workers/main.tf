resource "aws_iam_role" "nodes" {
  name = "${var.cluster_name}-nodes-role"

  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = "${aws_iam_role.nodes.name}"
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = "${aws_iam_role.nodes.name}"
}

resource "aws_iam_role_policy_attachment" "container_registry_readonly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = "${aws_iam_role.nodes.name}"
}

resource "aws_iam_instance_profile" "nodes" {
  name = "${var.cluster_name}-nodes-profile"
  role = "${aws_iam_role.nodes.name}"
}

data "aws_ami" "node" {
  filter {
    name   = "name"
    values = ["amazon-eks-node-v*"]
  }

  most_recent = true
  owners      = ["602401143452"] # Amazon EKS AMI Account ID
}

data "aws_region" "current" {}
locals {
  node_userdata = <<USERDATA
#!/bin/bash
set -o xtrace
/etc/eks/bootstrap.sh --apiserver-endpoint '${var.cluster_endpoint}' --b64-cluster-ca '${var.cluster_certificate_authority}' '${var.cluster_name}'
USERDATA
}

resource "aws_launch_configuration" "nodes" {
  associate_public_ip_address = true
  iam_instance_profile        = "${aws_iam_instance_profile.nodes.name}"
  image_id                    = "${data.aws_ami.node.id}"
  instance_type               = "${var.cluster_node_instance_type}"
  name_prefix                 = "${var.cluster_name}"
  security_groups             = ["${var.security_group_id}"]
  user_data_base64            = "${base64encode(local.node_userdata)}"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_autoscaling_group" "cluster" {
  desired_capacity     = "${var.cluster_desired_size}"
  launch_configuration = "${aws_launch_configuration.nodes.id}"
  max_size             = "${var.cluster_max_size}"
  min_size             = "${var.cluster_min_size}"
  name                 = "${var.cluster_name}"
  vpc_zone_identifier  = ["${var.subnet_ids}"]

  tag {
    key                 = "Name"
    value               = "${var.cluster_name}"
    propagate_at_launch = true
  }

  tag {
    key                 = "kubernetes.io/cluster/${var.cluster_name}"
    value               = "owned"
    propagate_at_launch = true
  }
}

locals {
  config_map_aws_auth = <<CONFIGMAPAWSAUTH
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: ${aws_iam_role.nodes.arn}
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
CONFIGMAPAWSAUTH
}
