const connection = {
    getUriForConnection: jest.fn(),
  },
  ConnectionProvider = {
    changeDatabase: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    getConnection: jest.fn(),
  },
  dataprotocol = {
    getProvider: jest.fn(),
  },
  DataProviderType = {},
  QueryProvider = {},
  SimpleExecuteResult = {};

module.exports = {
  connection,
  ConnectionProvider,
  dataprotocol,
  DataProviderType,
  QueryProvider,
  SimpleExecuteResult,
};
