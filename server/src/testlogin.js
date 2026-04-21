require('dotenv').config();

fetch('http://localhost:4000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'swayamforme@gmail.com',
    password: 'test123'
  })
})
.then(res => res.json())
.then(data => console.log('Login response:', JSON.stringify(data, null, 2)))
.catch(err => console.error('Error:', err.message));