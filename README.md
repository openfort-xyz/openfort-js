# openfort-typescript-client

## Registration of the player session
1. Create a key pair for the player:
```typescript
const playerKey = new KeyPair();
```

2. Authorize player with the game backend service and pass public key to the `openfortClient.players.createSession` api method

3. Save private key. You can use local storage, file storage or any other type of storaged 
```typescript
await keyPair.saveToLocalStorage();
```
```typescript
await keyPair.saveToFile();
```
```typescript
await KeyPair.saveToStorage(customeStorageImplementation);
```

4. Use the private key to communicate with openfort api.

5. To the future use one of the load methods to load key pair. Depends on the solution, that was chosen in the step 4.
```typescript
const playerKey = await KeyPair.loadFromLocalStorage();
```
```typescript
const playerKey = await KeyPair.loadFromFile();
```
```typescript
const playerKey = await KeyPair.loadFromStorage(customeStorageImplementation);
```
