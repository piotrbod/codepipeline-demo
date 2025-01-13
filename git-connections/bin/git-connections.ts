#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { GitConnectionsStack } from '../lib/git-connections-stack';

const app = new cdk.App();

new GitConnectionsStack(app, 'GitConnectionsStack', {
  owner: 'piotrbod',
  repo: 'codepipeline-demo',
  branch: 'test',
  environment: 'test',
  // Optional: Add other stack props if needed
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

app.synth();
