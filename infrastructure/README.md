# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

```
{
  "body": "{\"message\":\"What day is this?!\"}",
}
```

If setting up a VectorDB from scratch you have to remote as below and run the following:
```
CREATE TABLE embeddings (id SERIAL PRIMARY KEY,
text TEXT, embedding vector(1536), customer_name text,
embedding_name text);

CREATE EXTENSION vector;
```

To connect to the database you must use the bastion host.
The bastion host is an ec2 instance that can be accessed via ssh.
It should be turned off when not in use.
This is done by stopping the instance in the AWS console.
If it is left running it is a security risk and will cost money.
NOTE: Pushing your key will only allow the key to be used for 60 seconds!
    If you need to connect again you will need to push your key again.
- To set the ssh key
  - Generate your key pair `ssh-keygen -t rsa -f my_rsa_key`
  - Push your key to the bastion host `aws ec2-instance-connect send-ssh-public-key --region eu-west-2 --instance-id i-00xx0xx0099887766 --availability-zone eu-west-2a --instance-os-user ec2-user --ssh-public-key file://my_rsa_key.pub`
- To connect to the bastion host
  - connect via command line `ssh -o "IdentitiesOnly=yes" -i my_rsa_key ec2-user@ec2-00-999-777-666.eu-west-2.compute.amazonaws.com`
    - If you stop and start the bastion host it will get a new DNS name. You must use the new DNS name to connect.
  - The password is whatever you set when making the key pair

