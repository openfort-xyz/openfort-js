// Helper for displaying status messages.
const _addMessage = (message) => {
  const messagesDiv = document.querySelector('#messages')
  messagesDiv.style.display = 'block'
  messagesDiv.innerHTML += `> ${message}<br>`
  console.log(`Debug: ${message}`)
}
