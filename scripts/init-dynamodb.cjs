const {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");

function getRequiredEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function describeTable(client, tableName) {
  try {
    const result = await client.send(
      new DescribeTableCommand({ TableName: tableName }),
    );

    return result.Table ?? null;
  } catch (error) {
    if (error && error.name === "ResourceNotFoundException") {
      return null;
    }

    throw error;
  }
}

async function main() {
  const region = getRequiredEnv("AWS_REGION");
  const tableName = getRequiredEnv("DYNAMODB_TABLE_NAME");
  const client = new DynamoDBClient({ region });

  const existingTable = await describeTable(client, tableName);

  if (existingTable) {
    console.log(`DynamoDB table '${tableName}' already exists in ${region}.`);
    console.log(`Status: ${existingTable.TableStatus}`);
    console.log("Required keys: pk (partition), sk (sort)");
    return;
  }

  console.log(`Creating DynamoDB table '${tableName}' in ${region}...`);

  await client.send(
    new CreateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
      BillingMode: "PAY_PER_REQUEST",
    }),
  );

  await waitUntilTableExists(
    {
      client,
      maxWaitTime: 120,
    },
    {
      TableName: tableName,
    },
  );

  const createdTable = await describeTable(client, tableName);

  console.log(`DynamoDB table '${tableName}' is ready.`);
  console.log(`ARN: ${createdTable?.TableArn ?? "Unavailable"}`);
  console.log("Billing mode: PAY_PER_REQUEST");
  console.log("Keys: pk (partition), sk (sort)");
}

main().catch((error) => {
  console.error("Failed to initialize DynamoDB table.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});