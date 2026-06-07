import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import type { ImportActivity } from "@/lib/recall-repository";
import type { RecallIncident } from "@/lib/recall-data";

const globalForDynamo = globalThis as unknown as {
  dynamo?: DynamoDBDocumentClient;
};

const appPartitionKey = "RECALLZERO";

type IncidentItem = {
  pk: string;
  sk: string;
  entityType: "incident";
  incident: RecallIncident;
};

type ActivityItem = {
  pk: string;
  sk: string;
  entityType: "activity";
  activity: ImportActivity;
};

function getTableName() {
  return process.env.DYNAMODB_TABLE_NAME;
}

export function hasDynamoDbConfig() {
  return Boolean(process.env.AWS_REGION && getTableName());
}

export function getDynamoDbClient() {
  if (!hasDynamoDbConfig()) {
    return null;
  }

  if (!globalForDynamo.dynamo) {
    globalForDynamo.dynamo = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region: process.env.AWS_REGION }),
      {
        marshallOptions: { removeUndefinedValues: true },
      },
    );
  }

  return globalForDynamo.dynamo;
}

function chunkArray<T>(items: T[], chunkSize: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }

  return chunks;
}

export async function getDynamoDbIncidentStore() {
  const client = getDynamoDbClient();
  const tableName = getTableName();

  if (!client || !tableName) {
    return null;
  }

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": appPartitionKey,
        ":sk": "INCIDENT#",
      },
    }),
  );

  return (result.Items ?? [])
    .map((item) => (item as IncidentItem).incident)
    .sort((left, right) => right.lastUpdated.localeCompare(left.lastUpdated));
}

export async function getDynamoDbIncidentById(incidentId: string) {
  const client = getDynamoDbClient();
  const tableName = getTableName();

  if (!client || !tableName) {
    return null;
  }

  const result = await client.send(
    new GetCommand({
      TableName: tableName,
      Key: {
        pk: appPartitionKey,
        sk: `INCIDENT#${incidentId}`,
      },
    }),
  );

  return result.Item ? (result.Item as IncidentItem).incident : null;
}

export async function replaceIncidentsInDynamoDb(incidents: RecallIncident[]) {
  const client = getDynamoDbClient();
  const tableName = getTableName();

  if (!client || !tableName) {
    throw new Error("DynamoDB client could not be initialized.");
  }

  const existingIncidents = await getDynamoDbIncidentStore();
  const deleteRequests = (existingIncidents ?? []).map((incident) => ({
    DeleteRequest: {
      Key: {
        pk: appPartitionKey,
        sk: `INCIDENT#${incident.id}`,
      },
    },
  }));
  const putRequests = incidents.map((incident) => ({
    PutRequest: {
      Item: {
        pk: appPartitionKey,
        sk: `INCIDENT#${incident.id}`,
        entityType: "incident",
        incident,
      } satisfies IncidentItem,
    },
  }));

  for (const requestChunk of chunkArray([...deleteRequests, ...putRequests], 25)) {
    await client.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: requestChunk,
        },
      }),
    );
  }
}

export async function getDynamoDbImportActivityStore() {
  const client = getDynamoDbClient();
  const tableName = getTableName();

  if (!client || !tableName) {
    return null;
  }

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :sk)",
      ExpressionAttributeValues: {
        ":pk": appPartitionKey,
        ":sk": "ACTIVITY#",
      },
      ScanIndexForward: false,
      Limit: 8,
    }),
  );

  return (result.Items ?? []).map((item) => (item as ActivityItem).activity);
}

export async function appendImportActivityInDynamoDb(
  entry: Omit<ImportActivity, "id" | "timestamp" | "storageLabel">,
) {
  const client = getDynamoDbClient();
  const tableName = getTableName();

  if (!client || !tableName) {
    throw new Error("DynamoDB client could not be initialized.");
  }

  const activity: ImportActivity = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    storageLabel: entry.persistenceMode === "database" ? "DynamoDB" : "Fallback store",
    ...entry,
  };

  await client.send(
    new BatchWriteCommand({
      RequestItems: {
        [tableName]: [
          {
            PutRequest: {
              Item: {
                pk: appPartitionKey,
                sk: `ACTIVITY#${activity.timestamp}#${activity.id}`,
                entityType: "activity",
                activity,
              } satisfies ActivityItem,
            },
          },
        ],
      },
    }),
  );
}