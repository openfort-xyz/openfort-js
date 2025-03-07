/* eslint-disable */
import { openfort } from './openfort'
import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Openfort quick test</h1>
    <div class="card">
      <button id="in" type="button">Sign up as guest</button>
    </div>
    <div class="card">
      <button id="user" type="button">get user</button>
    </div>
    <div class="card">
      <button id="logout" type="button">Logout</button>
    </div>
    <p class="read-the-docs">
      Click on the buttons and check the console to test the Openfort SDK
    </p>
  </div>
`

console.log(openfort);

document.querySelector<HTMLButtonElement>('#in')
  ?.addEventListener('click', () => openfort.signUpGuest().then((r) => {
    console.log(r);
  }).catch((error) => {
    console.error('Sign up error:', error);
  }));

document.querySelector<HTMLButtonElement>('#user')
  ?.addEventListener('click', () => openfort.getUser().then((r) => {
    console.log(r);
  }).catch((error) => {
    console.error('Get user error:', error);
  }));

document.querySelector<HTMLButtonElement>('#logout')
  ?.addEventListener('click', () => openfort.logout().then(() => {
    console.log("Logged out");
  }).catch((error) => {
    console.error('Logout error:', error);
  }));

