const certificateVerifyingSslModeAliases = new Set(['prefer', 'require', 'verify-ca']);

export const normalizePostgresConnectionString = (connectionString) => {
  const connectionUrl = new URL(connectionString);
  if (!certificateVerifyingSslModeAliases.has(connectionUrl.searchParams.get('sslmode') ?? '')) return connectionString;

  connectionUrl.searchParams.set('sslmode', 'verify-full');
  return connectionUrl.toString();
};
