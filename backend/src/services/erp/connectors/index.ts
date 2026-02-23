/**
 * ERP Connectors Factory
 *
 * Cria instâncias dos conectores apropriados baseado no tipo de banco
 */

import { ErpConfig, DatabaseType, ErpConnectorInterface } from '../types';
import { BaseErpConnector } from './baseConnector';
import { MysqlErpConnector } from './mysqlConnector';
import { PostgresErpConnector } from './postgresConnector';
import { OracleErpConnector } from './oracleConnector';
import { SqlServerErpConnector } from './sqlserverConnector';

export function createErpConnector(config: ErpConfig): ErpConnectorInterface {
  switch (config.type) {
    case 'mysql':
      return new MysqlErpConnector(config);

    case 'postgresql':
      return new PostgresErpConnector(config);

    case 'oracle':
      return new OracleErpConnector(config);

    case 'sqlserver':
      return new SqlServerErpConnector(config);

    default:
      throw new Error(`Tipo de banco não suportado: ${config.type}`);
  }
}

export function getSupportedDatabaseTypes(): DatabaseType[] {
  return ['mysql', 'postgresql', 'oracle', 'sqlserver'];
}

export { BaseErpConnector, MysqlErpConnector, PostgresErpConnector, OracleErpConnector, SqlServerErpConnector };
