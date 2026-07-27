<template>
  <div class="login-inner-container">
    <div class="login-bg-decoration"></div>
    <div class="form-card">
      <div class="form-header">
        <div class="brand-area">
          <div class="brand-icon">
            <img src="@/assets/images/SoftwareIcon.jpeg" alt="" class="brand-img" />
          </div>
          <h2>{{ isLogin ? t('login.login') : t('login.register') }}</h2>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="field-group">
          <label class="field-label">{{ t('login.username') }}</label>
          <input
            class="form-input"
            v-model.trim="formData.username"
            type="text"
            :placeholder="t('login.username')"
            required
            @blur="validateUsername"
            @input="clearUsernameError"
          />
          <span v-if="usernameError" class="field-error">{{ usernameError }}</span>
        </div>

        <div class="field-group">
          <label class="field-label">{{ t('login.password') }}</label>
          <input
            class="form-input"
            v-model="formData.password"
            type="password"
            :placeholder="t('login.password')"
            required
          />
        </div>

        <template v-if="!isLogin">
          <div class="field-group">
            <label class="field-label">{{ t('login.confirmPassword') }}</label>
            <input
              class="form-input"
              v-model="formData.confirmPassword"
              type="password"
              :placeholder="t('login.confirmPassword')"
              required
            />
          </div>


          <div class="field-group">
            <label class="field-label">{{ t('login.activationCode') }}</label>
            <input
              class="form-input"
              v-model.trim="formData.ActivationCode"
              type="text"
              :placeholder="t('login.activationCode')"
              required
            />
          </div>


        </template>
        <div class="divider-line"></div>

        <div class="btn-group">
          <button type="submit" :disabled="loading" class="btn btn-primary">
            {{ loading ? t('login.loading') : (isLogin ? t('login.loginBtn') : t('login.registerBtn')) }}
          </button>
          <button type="button" @click="toggleForm" :disabled="loading" class="btn btn-ghost">
            {{ isLogin ? t('login.goRegister') : t('login.backLogin') }}
          </button>
        </div>
      </form>

      <div class="form-footer">
        <button type="button" class="lang-switch" @click="toggleLanguage">
          {{ locale === 'zh' ? t('common.switchToEnglish') : t('common.switchToChinese') }}
        </button>
      </div>
    </div>
  </div>

    <!-- Custom dialog -->
  <Transition name="dialog">
    <div v-if="dialogVisible" class="dialog-overlay" @click.self="closeDialog">
      <div class="dialog-card">
        <p class="dialog-message">{{ dialogMessage }}</p>
        <button type="button" class="btn btn-primary dialog-btn" @click="closeDialog">OK</button>
      </div>
    </div>
  </Transition>

</template>
<script lang="ts" setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { registerApi, loginApi } from '@/api/auth'

const router = useRouter()
const { t, locale } = useI18n()
const isLogin = ref(true)
const loading = ref(false)

const dialogVisible = ref(false)
const dialogMessage = ref('')

function showDialog(msg:any) {
  dialogMessage.value = msg
  dialogVisible.value = true
}

function closeDialog() {
  dialogVisible.value = false
  dialogMessage.value = ''
}


const usernameError = ref('')

function validateUsername() {
  const val = formData.username
  if (!val) {
    usernameError.value = ''
    return
  }
  if (val.length < 6) {
    usernameError.value = 'Username must be at least 6 characters'
    return
  }
  if (val.length > 12) {
    usernameError.value = 'Username must be at most 12 characters'
    return
  }
  if (!/^[a-zA-Z0-9]+$/.test(val)) {
    usernameError.value = 'Username may only contain English letters and numbers'
    return
  }
  usernameError.value = ''
}

function clearUsernameError() {
  usernameError.value = ''
}

const formData = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  ActivationCode: 'DY-AGENT-9F3A-K2M8'
})

onMounted(() => {
  const access_token = localStorage.getItem('access_token');
  const exp = localStorage.getItem('token_exp');
  if (access_token && exp && Date.now() < Number(exp)) {
    router.push('/main');
  }
})

const toggleForm = () => {
  isLogin.value = !isLogin.value
  usernameError.value = ''
  Object.assign(formData, {
    username: '',
    password: '',
    confirmPassword: '',
  })
}

const toggleLanguage = () => {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

const handleSubmit = async () => {
  if (loading.value) return

  if (!formData.username || !formData.password) return showDialog(t('login.validationRequired'))
  if (usernameError.value) return

  if (!isLogin.value) {
    if (formData.password !== formData.confirmPassword) return showDialog(t('login.passwordMismatch'))
  }

  loading.value = true
  try {
    if (isLogin.value) {
      const response = await loginApi({
        username: formData.username,
        password: formData.password
      })

      if (response.data && response.data.data.accessToken) {
        localStorage.setItem('access_token', response.data.data.accessToken);
        localStorage.setItem('token_exp', (Date.now() + 7200 * 1000).toString());

        if ((window as any).auth) {
          (window as any).auth.setToken(response.data.data.accessToken)
        }

        router.push('/main');
      } else {
        throw new Error(t('login.invalidLoginResponse'));
      }
    } else {
      await registerApi({
        username: formData.username,
        password: formData.password,
        ActivationCode: formData.ActivationCode
      })
      showDialog(t('login.registerSuccess'))
      toggleForm()
    }
  } catch (err: any) {
    showDialog(err.response?.data?.message || err.message || t('login.operationFailed'))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-inner-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #0f1923 0%, #1a2a3a 50%, #0d1b2a 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', Arial, sans-serif;
  overflow: hidden;
}

.login-bg-decoration {
  position: absolute;
  top: -50%;
  right: -30%;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.08) 0%, transparent 70%);
  pointer-events: none;
}

.login-bg-decoration::after {
  content: '';
  position: absolute;
  bottom: -40%;
  left: -30%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(64, 158, 255, 0.06) 0%, transparent 70%);
  pointer-events: none;
}

.form-card {
  position: relative;
  width: 90%;
  max-width: 400px;
  padding: 2rem 2rem 1.25rem;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.06);
}

.form-header {
  display: flex;
  align-items: center;
  margin-bottom: 1.75rem;
}

.brand-area {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.brand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 30px;
  background: linear-gradient(135deg, #5fafff, #6fb5ff);
  color: #fff;
  flex-shrink: 0;
  overflow: hidden;
}

.brand-img {
  width: 28px;
  height: 28px;
  display: block;
  object-fit: cover;
}

h2 {
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin: 0;
  color: #1e1e2f;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 500;
  color: #4a4a6a;
  letter-spacing: 0.01em;
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.7rem 0.9rem;
  font-size: 0.9rem;
  color: #1a1a2e;
  background: #f7f8fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
  outline: none;
  font-family: inherit;
}

.form-input:focus {
  border-color: #409eff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
}

.form-input:hover:not(:focus) {
  background: #f0f2f5;
  border-color: #c0c4cc;
}

.form-input::placeholder {
  color: #a8abb2;
}

.field-error {
  font-size: 0.75rem;
  color: #f56c6c;
  line-height: 1.3;
  margin-top: -0.1rem;
  min-height: 1em;
}

.divider-line {
  height: 1px;
  background: linear-gradient(to right, transparent, #e4e7ed, transparent);
  margin: 0.5rem 0 0.75rem;
}

.btn-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0.7rem 0;
  font-size: 0.9rem;
  font-weight: 550;
  font-family: inherit;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  border: none;
  outline: none;
  letter-spacing: 0.02em;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-primary {
  background-color: #409eff;
  color: #fff;
  box-shadow: 0 4px 14px rgba(64, 158, 255, 0.3);
}

.btn-primary:hover:not(:disabled) {
  background-color: #66b1ff;
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.4);
}

.btn-ghost {
  background: transparent;
  color: #606266;
  font-weight: 450;
  font-size: 0.85rem;
}

.btn-ghost:hover:not(:disabled) {
  color: #409eff;
  background: rgba(64, 158, 255, 0.06);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-footer {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid #f0f0f0;
}

.lang-switch {
  background: none;
  border: none;
  color: #909399;
  font-size: 0.78rem;
  font-family: inherit;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}

.lang-switch:hover {
  color: #409eff;
  background: rgba(64, 158, 255, 0.06);
}

/* Custom dialog */
.dialog-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1000;
}

.dialog-card {
  width: 320px;
  padding: 1.5rem 1.5rem 1.25rem;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  text-align: center;
}

.dialog-message {
  margin: 0.5rem 0 1.25rem;
  font-size: 0.9rem;
  color: #1a1a2e;
  line-height: 1.5;
  word-break: break-word;
}

.dialog-btn {
  width: 100%;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

</style>


