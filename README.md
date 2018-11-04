# Go HTTP API Proof

This is a proof-of-concept project for a Golang-based HTTP api, infrastucture code for running it on AWS, and tooling/automation around continuous integration and delivery.

## How to build it out

Requirements for getting started after cloning this repo:

1. [NodeJS >= 10.13](https://github.com/nodenv/nodenv)
2. Run `npm install` from the root of this clone
3. [Go](https://github.com/syndbg/goenv) and the following package `go get github.com/gorilla/mux` (for building the HTTP API)
4. For additional requirements, see `package.json` -> `clia.requirements`

All requirements are enforced when running the `clia` tool. And for more info on that tool...

### `clia`

It's a NodeJS-based CLI tool built into this project, designed to be a cross-platform way to quickly and easily run commands that build infrastructure and run other tasks related to the project. To see the available commands and info about operations and tasks it can execute:

```
./clia help
```

For more info, see https://www.npmjs.com/package/@rockholla/clia.

### Setup

`clia` has built in configuration management:

```
./clia use mine
```

Which will help you create a new config file at `/config/mine.js`. Edit that file to add your [AWS named profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html) which will be used for connecting to AWS and creating/managing infrastructure there:

```
module.exports = {
  aws: {
    profile: "[name of your profile for config/creds]"
  }
}
```

Next, run:

```
./clia cicd init
```

The above will initialize your local CI/CD environment by adding a pre-commit git hook to run tests and a build before commits are accepted. More on CI/CD below.

### Building the Infrastructure

Simply run:

```
./clia infrastructure apply
```

What the above creates:

1. A dedicated AWS VPC
2. An EKS Cluster control plane
3. EKS worker nodes with configurable number of min, max, and desired worker nodes, and configurable EC2 instance type for nodes (via a Launch Configuration)
4. An auto-scaling group for worker nodes that
    * Adds a node if CPU utilization is above 80% across nodes for 10 mins
    * Removes a node if CPU utilization is less than 10% across nodes for 10 mins
    * The HTTP API is deployed into the EKS cluster using a [`DaemonSet`](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/), so the auto-scaling of worker nodes ensures that our pods/containers also scale as the nodes themselves scale
4. Associated security groups and IAM roles/profiles for assigning to and managing resources internally

When you're done, you can destroy everything in AWS:

```
./clia infrastructure destroy
```

## Developing

The structure of this project:

```
├── api (the go HTTP API code)
├── build (resources and staging artifacts for API build/deploy)
|   └── Dockerfile (image of the HTTP API this is built/deployed)
|   └── kubernetes (templates for kubernetes resources)
├── commands (clia commands definition)
├── config (clia configuration)
├── lib
│   └── aws.js (AWS library SDK/CLI)
│   └── common.js (Common/shared library)
│   └── kubernetes.js (Library for interacting with k8s cluster)
│   └── terraform.js (Library for executing terraform)
├── terraform (terraform definitions)
├── tests (automated test suite for both infra code, and API)
```

### Continuous Integration and Delivery

Our "CI server" for this project is included in the project itself. Here's how it works and automates SCM flow, building, testing, and releasing:

1. The `./clia cicd init` command mentioned above initializes your local clone to support automating continuous integration around commits and general development
2. You can use `./clia cicd build` at any point to lint/test/rebuild
3. `./clia cicd release` does the following:
    * Enforces no unstaged changes in your clone and that you're on the `develop` branch
    * Runs `cicd build`
    * Increments your project version (in package.json) based on whether or not it's a major, minor, or patch release
    * Creates a release commit then merges with the `master` branch, creates a tag based on package.json version
    * (Attempts to push branches/tags to git origin, warns if no push access)
    * Deploys the Go HTTP API to the AWS EKS cluster, a Kubernetes [`DaemonSet`](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/) fronted by a Load-balanced Service
4. Linting, testing, and building scripts are also available for running individually via `npm run ...`. See `package.json` for all available.

After running `./clia cicd release`, the log will let you know the endpoint for your deploy.

## Try it out

The HTTP API in this project is serving up a list of trailheads and their location. Maybe we want to add more to the list, so here's a fun exercise to do that and see it all in action:

1. Make sure the requirements are met and you have a local clone of this project
2. Initialize CI/CD if you haven't already: `./clia cicd init`
3. Ensure your infrastructure is in place: `./clia infrastructure apply`
4. Deploy the app: `./clia cicd release`
5. Add some trailheads to the API in `api/main.go`
6. Commit your changes (see how the git pre-commit hook will lint/test/build automatically before accepting the commit)
7. Deploy your new code: `./clia cicd release`, go to the endpoint provided in the log output and see your new trailheads

Don't forget to bring it all down when you're done:

```
./clia infrastructure destroy
```

## Additional Notes

This is to provide some additional context around decisions within this project.

1. There are a number of local requirements while running this. In a real/client situation, We'd likely have something like a jump box/bastion spun up on the cloud with most dependencies installed automatically for us there to run commands. A bootstrap command that would have fewer local requirements could spin up base resources in the cloud, connect to that jump box, and all other operations would run from there. The intention is to keep the infrastructure as simple as possible for this proof though.
2. Typically a CI server/service like Jenkins, Bamboo, Travis, CircleCI, etc. would be used here to wire up the build and deployment pipeline, webooks via SCM, dedicated build environments, and deployment config and mechanisms from that tool. Again, for the sake of simplicity in infrastructure though, I've wrapped it all in the `clia` tool: `./clia cicd help`. Essentially a CI server embedded in the project itself, and you can imagine similar operations being triggered on a remote CI server.
3. `/tests` have been built out minimally, really just to show that they are wired into the pipeline functionally for running both infrastructure code and HTTP API tests.
3. This project was focused on AWS, but [a Go App Engine project](https://cloud.google.com/appengine/docs/standard/go/quickstart) in Google Cloud would probably be the easiest path for something like this.
4. The app-level auto-scaling approach of choice here ([`DaemonSet`](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)) is, again, an attempt at keeping it simple. There are a handful of other routes that you could go via Kubernetes to scale. Depending on the actual application, you might opt for [horizontal pod autoscaling](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/), or even explore things like multiple clusters across regions or datacenters with a load balancer directing traffic to both.
