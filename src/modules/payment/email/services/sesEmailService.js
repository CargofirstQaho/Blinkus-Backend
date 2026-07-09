import { SendEmailCommand, SendRawEmailCommand} from '@aws-sdk/client-ses';
import { sesClient } from '../../../../config/sesClient.js';


export async function sendViaSes(params, client = sesClient) {
  const command = new SendEmailCommand(params);
  return client.send(command);
}

export async function sendRawViaSes(rawMessage, client = sesClient) {
  const command = new SendRawEmailCommand({ RawMessage: { Data: rawMessage } });
  return client.send(command);
}

