import * as SQLite from 'expo-sqlite';

let dbCache: SQLite.SQLiteDatabase | null = null;

export const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbCache) {
    return dbCache;
  }
  
  dbCache = await SQLite.openDatabaseAsync('dompetku.db');
  return dbCache;
};

// Types for SQLite results
export type RunResult = SQLite.SQLiteRunResult;
export type QueryResult<T> = T[];

export const executeSql = async (
  sqlStatement: string,
  args?: any[] | Record<string, any>
): Promise<RunResult> => {
  const db = await getDb();
  return await db.runAsync(sqlStatement, args || []);
};

export const fetchAll = async <T>(
  sqlStatement: string,
  args?: any[] | Record<string, any>
): Promise<T[]> => {
  const db = await getDb();
  return await db.getAllAsync<T>(sqlStatement, args || []);
};

export const fetchOne = async <T>(
  sqlStatement: string,
  args?: any[] | Record<string, any>
): Promise<T | null> => {
  const db = await getDb();
  return await db.getFirstAsync<T>(sqlStatement, args || []);
};
