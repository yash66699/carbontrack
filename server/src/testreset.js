require('dotenv').config();

fetch('http://localhost:4000/api/auth/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'swayamforme@gmail.com' })
})
.then(res => res.json())
.then(data => console.log('Reset response:', JSON.stringify(data, null, 2)))
.catch(err => console.error('Error:', err.message));