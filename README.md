# Go HTTP API Proof

This is a proof-of-concept project for a Golang-based HTTP api, infrastucture code for running it on AWS, and tooling/automation around automated deployment all housed within.

## How to build it out

Requirements for getting started:

1. [NodeJS >= 10.13](https://github.com/nodenv/nodenv)
2. Run `npm install` from your clone of this project
3. For additional requirements, see `package.json` `clia.requirements`
4. Go package: `github.com/gorilla/mux`
4. (Optional) [Go](https://github.com/syndbg/goenv) if you want to develop or actually run the Go app locally

All requirements are enforced when running the `clia` tool. And for more info on that tool...

### `clia`

It's a NodeJS-based CLI tool built into this project, designed to be a cross-platform way to quickly and easily run commands that build infrastructure and run other tasks related to the project. To see the available commands and info about operations and tasks it can execute:

```
./clia help
```

For more info, see https://www.npmjs.com/package/@rockholla/clia.

### Setup

Config and other setup is first. `clia` has built in configuration management:

```
./clia use mine
```

Which will help you create a new config file at `/config/mine.js`. Edit that file to add your [AWS named profile](https://docs.aws.amazon.com/cli/latest/userguide/cli-multiple-profiles.html) which will be used for connecting to AWS to create and manage infrastructure:

```
module.exports = {
  aws: {
    profile: "[name of your profile for config/creds]"
  }
}
```

For setup, finally run:

```
./clia cicd init
```

The above will do the following initialize your local CI/CD environment by adding a pre-commit git hook to run tests and a build before commits are accepted

### Building the Infrastructure

Simply run:

```
./clia infrastructure apply
```

What the above creates:

1. A dedicated AWS VPC
2. An EKS Cluster control plane
3. EKS worker nodes with configurable number of min, max, and desired worker nodes via an auto-scaling group
4. Associated security groups and IAM roles for managing resources internally

When you're done, you can destroy everything in AWS:

```
./clia infrastructure destroy
```

## Developing

The structure of this project:

```
├── api (the go HTTP API code)
├── build (resources and staging ground for API build)
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

1. The `./clia cicd init` command above initializes your local clone to support automating continuous integration around commits and general development
2. You can used `./clia cicd build` at any point to lint/test/rebuild
3. `./clia cicd release` does the following:
    * Enforces no unstaged changes in your clone and that you're on the `develop` branch
    * Runs tests/build
    * Increments your project version (in package.json) based on whether or not it's a major, minor, or patch release
    * Creates a release commit then merges with the `master` branch, creates a tag based on package.json version
    * Attempts to push changes to origin, warns if no push access
    * Deploys the Go HTTP API to the AWS EKS cluster, a Kubernetes Deployment with pod horizontal auto-scaling, and rolling upgrades
4. Linting, testing, and building scripts are also available for running individually via `npm run ...`. See `package.json` for all available.

## Additional Notes

This is to provide some additional context around decisions within this project.

1. There are a number of local requirements while running this. In a real/client situation, We'd likely have something like a jump box/bastion spun up on the cloud with most dependencies installed automatically for us there to run commands. A bootstrap command that would have fewer local requirements could spin up base resources in the cloud, connect to that jump box, and other commands would run from there. Keeping the infrastructure as simple as possible for this proof though.
2. Typically a CI server like Jenkins, Bamboo, Travis, CircleCI, etc. would be used here to wire up the build and deployment pipeline, webooks via SCM, dedicated build environments, and deployment config and mechanisms from that tool. For the sake of simplicity for this demo, I've wrapped it all in the `clia` tool here: `./clia cicd help`. Essentially a CI server embedded in the project itself. Again, just keeping the number of infrastructure resources and tools to a minimum for the sake of a proof/demo.
3. Tests in `/tests` are minimal, just to show that they are wired into the pipeline functionally for both the infrastructure code and HTTP API for functional testing
3. This project was focused on AWS, but [a Go App Engine project](https://cloud.google.com/appengine/docs/standard/go/quickstart) in Google Cloud would probably be the easiest path for something like this.
