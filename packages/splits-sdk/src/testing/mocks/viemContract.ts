type ActionDict = {
  [key: string]: jest.Mock
}

export class MockViemContract {
  read: ActionDict
  write: ActionDict

  constructor(readActions: ActionDict, writeActions: ActionDict) {
    this.read = readActions
    this.write = writeActions
  }

  connect() {
    return this.write
  }
}
