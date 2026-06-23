const proxyUrl  = 'https://localhost:500/'
const targetUrl = 'https://www.7timer.info/bin/api.pl?lon=-118.243&lat=34.052&product=civil&output=json'
const apikey    = 'your_api_key_here'

const full_URL = proxyUrl + '?target=' + targetUrl + '&apikey=' + apikey
console.log(full_URL)

fetch(full_URL)
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error))