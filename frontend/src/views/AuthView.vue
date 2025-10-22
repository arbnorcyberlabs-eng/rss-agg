<template>
  <div class="auth-view">
    <Header />
    <div class="container">
      <div class="auth-container">
        <div class="auth-header">
          <h1>Welcome to RSS Feed Aggregator</h1>
          <p>Sign in to your account or create a new one to get started</p>
        </div>
        
        <AuthForm />
        
        <div class="auth-footer">
          <p>By signing up, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
    <Footer />
  </div>
</template>

<script>
import Header from '../components/common/Header.vue'
import Footer from '../components/common/Footer.vue'
import AuthForm from '../components/Admin/LoginForm.vue'

export default {
  name: 'AuthView',
  components: {
    Header,
    Footer,
    AuthForm
  }
}
</script>

<style scoped>
.auth-view {
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.container {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
}

.auth-container {
  max-width: 500px;
  width: 100%;
  background: #ffffff;
  border: 2px solid #000000;
  padding: 40px;
  box-shadow: 5px 5px 0px #000000;
}

.auth-header {
  text-align: center;
  margin-bottom: 30px;
}

.auth-header h1 {
  font-size: 2em;
  font-weight: 700;
  margin-bottom: 10px;
  color: #000000;
}

.auth-header p {
  font-size: 1.1em;
  color: #666666;
  line-height: 1.5;
}

.auth-footer {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eeeeee;
}

.auth-footer p {
  font-size: 0.9em;
  color: #999999;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .container {
    padding: 20px 15px;
  }
  
  .auth-container {
    padding: 30px 20px;
  }
  
  .auth-header h1 {
    font-size: 1.6em;
  }
  
  .auth-header p {
    font-size: 1em;
  }
}
</style>
