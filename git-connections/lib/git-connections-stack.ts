import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipelineActions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { CfnConnection } from 'aws-cdk-lib/aws-codeconnections';

interface GitConnectionsStackProps extends StackProps {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly environment: string;
}

export class GitConnectionsStack extends Stack {
  constructor(scope: Construct, id: string, props: GitConnectionsStackProps) {
    super(scope, id, props);

    // Validate required parameters
    if (!props.owner || !props.repo || !props.branch) {
      throw new Error('GitHub owner, repo, and branch must be provided');
    }

    // Create a CodeConnections Connection
    const codeConnectionsConnection = new CfnConnection(this, 'MyCodeStarConnection', {
      connectionName: `${props.environment}-demo-connection`,
      providerType: 'GitHub',
    });

    // Define artifacts
    const sourceOutput = new codepipeline.Artifact();
    const buildOutput = new codepipeline.Artifact();

    // Create a CodeBuild project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      projectName: `${props.environment}-build-project`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          build: {
            commands: [
              'echo "Hello, CodeBuild!"',
              'npm install',
              'npm run build'
            ]
          }
        },
        artifacts: {
          files: ['**/*']
        }
      })
    });

    // Create a CodePipeline
    const pipeline = new codepipeline.Pipeline(this, 'Pipeline', {
      pipelineName: `${props.environment}-DemoPipeline`,
      crossAccountKeys: false,
    });

    // Add the source stage
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new codepipelineActions.CodeStarConnectionsSourceAction({
          actionName: 'GitHubSource',
          connectionArn: codeConnectionsConnection.attrConnectionArn,
          owner: props.owner,
          repo: props.repo,
          branch: props.branch,
          output: sourceOutput,
        }),
      ],
    });

    // Add the build stage
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new codepipelineActions.CodeBuildAction({
          actionName: 'BuildAction',
          project: buildProject,
          input: sourceOutput,
          outputs: [buildOutput],
        }),
      ],
    });

    // Add tags to resources
    cdk.Tags.of(this).add('Environment', props.environment);
    cdk.Tags.of(pipeline).add('Environment', props.environment);
    cdk.Tags.of(codeConnectionsConnection).add('Environment', props.environment);
    cdk.Tags.of(buildProject).add('Environment', props.environment);

    // Output the connection ARN
    new cdk.CfnOutput(this, 'ConnectionArn', {
      value: codeConnectionsConnection.attrConnectionArn,
      description: 'The ARN of the CodeConnections connection',
      exportName: `${props.environment}-ConnectionArn`,
    });

    // Output the pipeline ARN
    new cdk.CfnOutput(this, 'PipelineArn', {
      value: pipeline.pipelineArn,
      description: 'The ARN of the CodePipeline',
      exportName: `${props.environment}-PipelineArn`,
    });
  }
}
