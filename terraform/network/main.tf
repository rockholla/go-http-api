data "aws_availability_zones" "available" {}

resource "aws_vpc" "primary" {
  cidr_block = "10.0.0.0/16"
  tags = "${
    map(
     "Name", "${var.name}",
     "kubernetes.io/cluster/${var.name}", "shared",
    )
  }"
}

resource "aws_subnet" "primary" {
  count             = "${length(data.aws_availability_zones.available.names)}"
  availability_zone = "${data.aws_availability_zones.available.names[count.index]}"
  cidr_block        = "10.0.${count.index}.0/24"
  vpc_id            = "${aws_vpc.primary.id}"
  tags = "${
    map(
     "Name", "${var.name}",
     "kubernetes.io/cluster/${var.name}", "shared",
    )
  }"
}

resource "aws_internet_gateway" "primary" {
  vpc_id = "${aws_vpc.primary.id}"
  tags {
    Name = "${var.name}"
  }
}

resource "aws_route_table" "primary" {
  vpc_id = "${aws_vpc.primary.id}"
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.primary.id}"
  }
}

resource "aws_route_table_association" "primary" {
  count           = "${length(data.aws_availability_zones.available.names)}"
  subnet_id       = "${aws_subnet.primary.*.id[count.index]}"
  route_table_id  = "${aws_route_table.primary.id}"
}
