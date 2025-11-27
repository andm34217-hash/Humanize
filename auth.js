// auth.js — gestionează utilizatorii în localStorage
function createAccount(email, password){
  if(!email || !password) return {success:false, message:'Completează email și parolă'}
  const users = JSON.parse(localStorage.getItem('users')||'{}')
  if(users[email]) return {success:false, message:'Emailul există deja'}
  users[email] = {email:email, password:password, plan:'free', creditsUsedToday:0, lastReset:new Date().toDateString()}
  localStorage.setItem('users', JSON.stringify(users))
  return {success:true, message:'Cont creat'}
}

function login(email, password){
  const users = JSON.parse(localStorage.getItem('users')||'{}')
  if(!users[email]) return {success:false, message:'Contul nu există'}
  if(users[email].password !== password) return {success:false, message:'Parolă greșită'}
  localStorage.setItem('currentUser', email)
  return {success:true, message:'Autentificare reușită'}
}

function logout(){
  localStorage.removeItem('currentUser')
  window.location.href = 'index.html'
}

function getCurrentUser(){
  const email = localStorage.getItem('currentUser')
  if(!email) return null
  const users = JSON.parse(localStorage.getItem('users')||'{}')
  return users[email] || null
}
