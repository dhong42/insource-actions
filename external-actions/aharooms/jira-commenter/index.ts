import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { Input } from './interfaces';
import { getCommentString, getCommentsOfAdmin } from './comment-utils';
import * as github from '@actions/github';
import * as Webhooks from '@octokit/webhooks';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const getOptions = (fn: any) => async (args: Input) => {
  let output = '';
  const options = {
    listeners: {
      stdout: (data) => {
        output += data.toString();
      },
    },
  };
  const commentPayload = getCommentString({
    appName: args.appName,
    commitLink: core.getInput('commit-link'),
    previewUrl: args.previewUrl,
    pullRequestLink: core.getInput('pull-request-link'),
  });
  await fn({ ...args, commentPayload, options });

  return JSON.parse(output);
};

const getListOfComments = async ({
  jiraEndpoint,
  jiraIssueId,
  jiraAccount,
  jiraAuthToken,
  options,
}: Input) => {
  const oneline = `curl -g --request GET --url ${jiraEndpoint}${jiraIssueId}/comment --user ${jiraAccount}:${jiraAuthToken} --header Accept:application/json --header Content-Type:application/json`;
  await exec.exec(oneline, [], options);
};

const createNewComment = async ({
  jiraEndpoint,
  jiraIssueId,
  jiraAccount,
  jiraAuthToken,
  commentPayload,
  options,
}: Input) => {
  const oneline = `curl -g --request POST --url ${jiraEndpoint}${jiraIssueId}/comment --user ${jiraAccount}:${jiraAuthToken} --header Accept:application/json --header Content-Type:application/json --data ${commentPayload}`;
  await exec.exec(oneline, [], options);
};

const editComment = async ({
  jiraEndpoint,
  jiraIssueId,
  jiraAccount,
  jiraAuthToken,
  commentId,
  commentPayload,
  options,
}: Input) => {
  const oneline = `curl -g --request PUT --url ${jiraEndpoint}${jiraIssueId}/comment/${commentId} --user ${jiraAccount}:${jiraAuthToken} --header Accept:application/json --header Content-Type:application/json --data ${commentPayload}`;
  await exec.exec(oneline, [], options);
};

async function run() {
  try {
    const jiraEndpoint = core.getInput('jira-endpoint');
    const jiraIssueIdRaw = core.getInput('jira-issue-id');
    const jiraAccount = core.getInput('jira-account');
    const jiraAuthToken = core.getInput('jira-auth-token');
    const appName = core.getInput('app-name');
    const previewUrl = core.getInput('deploy-preview-url');
    const resolveTicketIdsScript = core.getInput('resolve-ticket-ids-script');

    if (
      (!jiraIssueIdRaw || jiraIssueIdRaw === '') &&
      resolveTicketIdsScript === ''
    ) {
      core.warning('Jira issue id not found, exiting...');
    } else {
      const script =
        resolveTicketIdsScript === ''
          ? undefined
          : new AsyncFunction('branchName', resolveTicketIdsScript);
      let jiraIssueId = [Number(jiraIssueIdRaw)];
      if (script) {
        const context = github.context;
        const { eventName, payload } = context;
        if (eventName === 'pull_request') {
          const {
            pull_request: {
              head: { ref },
            },
          } = payload as Webhooks.WebhookPayloadPullRequest;
          const result = await script(ref);
          if (typeof result === 'number') {
            jiraIssueId = [result];
          }
          jiraIssueId = result;
        }
      }

      jiraIssueId.forEach(async (id) => {
        const inputParams = {
          jiraAccount,
          jiraAuthToken,
          jiraEndpoint,
          jiraIssueId: id,
          script,
        };

        const comments = await getOptions(getListOfComments)(inputParams);

        const commentsOfAdmin = getCommentsOfAdmin(
          comments.comments,
          jiraAccount,
          appName,
        );

        if (commentsOfAdmin.length === 0) {
          await getOptions(createNewComment)({
            ...inputParams,
            appName,
            previewUrl,
          });
        } else {
          const latestCommentId = commentsOfAdmin.pop().id;
          await getOptions(editComment)({
            ...inputParams,
            commentId: latestCommentId,
            appName,
            previewUrl,
          });
        }
      });
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();
