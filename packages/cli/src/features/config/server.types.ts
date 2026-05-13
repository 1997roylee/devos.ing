export interface ServerDatabaseConfig {
	databasePath: string;
}

export interface ServerRuntimeConfig {
	database: ServerDatabaseConfig;
}
