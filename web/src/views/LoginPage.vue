<template>
  <div ref="containerRef" class="jellyfish-page">
    <canvas ref="canvasRef" class="bg-canvas"></canvas>

    <div class="login-box">
      <header class="login-header">
        <h1>欢迎登录</h1>
      </header>

      <div class="login-main">
        <a-form layout="vertical" @finish="onSubmit">
          <a-form-item label="用户名" class="form-item">
            <a-input
              v-model:value="form.username"
              placeholder="请输入登录名"
              :maxlength="20"
              @input="form.username = sanitizeUsername(form.username)"
            />
          </a-form-item>

          <a-form-item label="密码" class="form-item">
            <a-input-password
              v-model:value="form.password"
              placeholder="请输入密码"
              :maxlength="20"
              @input="form.password = sanitizePassword(form.password)"
            />
          </a-form-item>

          <div class="login-actions">
            <a-checkbox v-model:checked="form.rememberMe">记住帐号</a-checkbox>
            <a-button type="primary" html-type="submit" class="login-btn" :loading="loading" @click="onSubmit">
              登录
            </a-button>
          </div>
        </a-form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const form = reactive({ username: 'yyh_y', password: '123456', rememberMe: true })

const usernamePattern = /^[A-Za-z0-9_]+$/
const passwordPattern = /^[A-Za-z0-9_!@#$%^&*]+$/

const sanitizeUsername = (value: string) => value.replace(/[^A-Za-z0-9_]/g, '').slice(0, 20)
const sanitizePassword = (value: string) => value.replace(/[^A-Za-z0-9_!@#$%^&*]/g, '').slice(0, 20)

const onSubmit = async () => {
  form.username = sanitizeUsername(form.username)
  form.password = sanitizePassword(form.password)
  if (!usernamePattern.test(form.username) || form.username.length < 4) {
    message.error('用户名只能包含字母、数字和下划线，长度 4 到 20 位')
    return
  }
  if (!passwordPattern.test(form.password) || form.password.length < 6) {
    message.error('密码只能包含字母、数字和部分符号，长度 6 到 20 位')
    return
  }
  loading.value = true
  console.log(form);
  try {
    await auth.login(form.username, form.password)
    message.success('登录成功')
    router.push('/')
  } catch (error: any) {
    message.error(error?.response?.data?.message || '登录失败')
  } finally {
    loading.value = false
  }
}

type Point = { x: number; y: number }

class Jellyfish {
  x = 0
  y = 0
  vx = 0
  vy = 0
  direction = 0
  expansion = 0
  expansionDelta = 0
  baseX = 0
  baseY = 0
  baseCPX = 0
  baseCPY = 0
  expansionOffset = 0
  feelerLength = 0
  feelerWidth = 0
  extensionRate = 0
  radius = 0
  constructor(private renderer: JellyRenderer, randomStart = true) {
    this.init(randomStart)
  }
  private rand(min: number, max: number) {
    return min + (max - min) * Math.random()
  }
  init(randomStart = true) {
    const { width, height, radius } = this.renderer
    if (randomStart) {
      this.x = this.rand(-100, width + 100)
      this.y = this.rand(-100, height + 100)
      this.direction = this.rand(0, Math.PI * 2)
    } else {
      const side = (Math.random() * 4) | 0
      if (side === 0) {
        this.x = -100
        this.y = this.rand(0, height)
        this.direction = this.rand(Math.PI / 4, (Math.PI * 3) / 4)
      } else if (side === 1) {
        this.x = this.rand(0, width)
        this.y = -100
        this.direction = this.rand((Math.PI * 3) / 4, (Math.PI * 5) / 4)
      } else if (side === 2) {
        this.x = width + 100
        this.y = this.rand(0, height)
        this.direction = this.rand((Math.PI * 5) / 4, (Math.PI * 7) / 4)
      } else {
        this.x = this.rand(0, width)
        this.y = height + 100
        this.direction = this.rand((Math.PI * 3) / 4, (Math.PI * 5) / 4)
      }
    }
    this.expansion = 0
    this.expansionDelta = this.rand(Math.PI / 120, Math.PI / 30)
    this.vx = 0
    this.vy = 0
    this.baseX = this.rand(10, 15)
    this.baseY = this.rand(0, 5)
    this.baseCPX = this.rand(20, 50)
    this.baseCPY = this.rand(-40, -20)
    this.expansionOffset = this.rand(0.2, 0.5)
    this.feelerLength = this.rand(15, 30)
    this.feelerWidth = this.rand(2, 4)
    this.extensionRate = this.rand(0.5, 1.5)
    this.radius = radius
  }
  update() {
    this.expansion = (this.expansion + this.expansionDelta) % (Math.PI * 2)
    this.x += this.vx
    this.y += this.vy
    if (this.expansion >= 0 && this.expansion <= Math.PI) {
      this.vx += Math.sin(this.direction) * this.expansionDelta * 0.2
      this.vy += -Math.cos(this.direction) * this.expansionDelta * 0.2
    }
    this.vx *= 0.96
    this.vy *= 0.96
    if (
      (this.x < -100 && this.vx < 0) ||
      (this.x > this.renderer.width + 100 && this.vx > 0) ||
      (this.y < -100 && this.vy < 0) ||
      (this.y > this.renderer.height + 100 && this.vy > 0)
    ) {
      this.init(false)
    }
  }
  draw(ctx: CanvasRenderingContext2D, focus: Point) {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.direction)
    const dx = this.x - focus.x
    const dy = this.y - focus.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const opacity = 0.1 + 0.9 * Math.pow(1 - Math.min(1, dist / this.renderer.distance), 2)
    const feelerColor = `hsla(240, 80%, 80%, ${0.5 * opacity})`
    const patternColor = `hsla(240, 80%, 80%, ${0.8 * opacity})`
    const gradient = ctx.createRadialGradient(0, this.baseCPY, 0, 0, this.baseCPY, this.baseY - this.baseCPY)
    gradient.addColorStop(0, `hsla(245, 100%, 100%, ${opacity})`)
    gradient.addColorStop(0.5, `hsla(245, 100%, 80%, ${0.6 * opacity})`)
    gradient.addColorStop(1, `hsla(245, 100%, 60%, ${0.4 * opacity})`)
    const baseX = this.baseX * (1 + this.expansionOffset * Math.cos(this.expansion))
    const theta = Math.PI / 2 - Math.abs((Math.PI - this.expansion)) / 2

    ctx.fillStyle = gradient
    ctx.strokeStyle = patternColor
    ctx.lineWidth = 2

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(-baseX, this.baseY)
    ctx.bezierCurveTo(-this.baseCPX, this.baseCPY, this.baseCPX, this.baseCPY, baseX, this.baseY)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    ctx.beginPath()
    ctx.moveTo(-baseX * 0.6, this.baseY)
    ctx.bezierCurveTo(-this.baseCPX * 0.8, this.baseCPY * 0.5, this.baseCPX * 0.8, this.baseCPY * 0.5, baseX * 0.6, this.baseY)
    ctx.stroke()

    const drawDot = (tx: number, ty: number, rotate: number) => {
      ctx.save()
      ctx.beginPath()
      ctx.translate(tx, ty)
      ctx.rotate(rotate)
      ctx.scale(1, 0.5)
      ctx.arc(0, 0, 4, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }
    drawDot(0, this.baseCPY * 0.45, 0)
    drawDot(-7, this.baseCPY * 0.4, -theta)
    drawDot(7, this.baseCPY * 0.4, theta)

    for (let i = -3; i <= 3; i++) {
      ctx.save()
      ctx.strokeStyle = feelerColor
      ctx.beginPath()
      ctx.translate(i * 2, this.baseY)
      ctx.moveTo(0, 0)
      const cy = this.expansion <= Math.PI ? (Math.PI - this.expansion) / Math.PI : (this.expansion - Math.PI) / Math.PI
      const x = i * this.feelerWidth * cy
      const rate = cy > 0.5 ? 1 - cy : cy
      ctx.bezierCurveTo(x * this.extensionRate, this.feelerLength * rate, x * this.extensionRate, this.feelerLength * (1 - rate), x, this.feelerLength)
      ctx.stroke()
      ctx.restore()
    }

    ctx.restore()
  }
}

class Dust {
  x = 0
  y = 0
  vx = 0
  vy = 0
  theta = 0
  deltaTheta = 0
  gradient!: CanvasGradient
  constructor(private renderer: JellyRenderer) {
    this.init()
  }
  init() {
    const phi = Math.random() * Math.PI * 2
    this.x = Math.random() * this.renderer.width
    this.y = Math.random() * this.renderer.height
    this.vx = 0.1 * Math.sin(phi)
    this.vy = 0.1 * Math.cos(phi)
    this.theta = 0
    this.deltaTheta = this.renderer.rand(Math.PI / 500, Math.PI / 100)
    this.gradient = this.renderer.ctx.createRadialGradient(0, 0, 0, 0, 0, 5)
    this.gradient.addColorStop(0, 'hsla(220, 80%, 100%, 1)')
    this.gradient.addColorStop(0.1, 'hsla(220, 80%, 80%, 1)')
    this.gradient.addColorStop(0.25, 'hsla(220, 80%, 50%, 1)')
    this.gradient.addColorStop(1, 'hsla(220, 80%, 30%, 0)')
  }
  draw(ctx: CanvasRenderingContext2D, focus: Point) {
    ctx.save()
    ctx.translate(this.x, this.y)
    const dx = this.x - focus.x
    const dy = this.y - focus.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    ctx.globalAlpha = Math.abs(Math.sin(this.theta)) * (0.2 + 0.8 * Math.pow(Math.min(1, dist / this.renderer.distance), 2))
    ctx.fillStyle = this.gradient
    ctx.beginPath()
    ctx.arc(0, 0, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    this.x += this.vx
    this.y += this.vy
    this.theta = (this.theta + this.deltaTheta) % (Math.PI * 2)
    if (this.x < -5 || this.x > this.renderer.width + 5 || this.y < -5 || this.y > this.renderer.height + 5) {
      this.init()
    }
  }
}

class JellyRenderer {
  width = 0
  height = 0
  radius = 0
  distance = 0
  x = 0
  y = 0
  destinationX = 0
  destinationY = 0
  ctx!: CanvasRenderingContext2D
  jellyfishes: Jellyfish[] = []
  dusts: Dust[] = []
  animationId = 0
  resizeObserver?: ResizeObserver

  constructor(private container: HTMLDivElement, private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    this.resize()
    this.bindEvents()
    this.render = this.render.bind(this)
    this.animationId = requestAnimationFrame(this.render)
  }

  rand(min: number, max: number) {
    return min + (max - min) * Math.random()
  }

  resize() {
    const rect = this.container.getBoundingClientRect()
    this.width = rect.width
    this.height = rect.height
    this.canvas.width = rect.width * window.devicePixelRatio
    this.canvas.height = rect.height * window.devicePixelRatio
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    this.ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
    this.radius = Math.sqrt((this.width / 2) ** 2 + (this.height / 2) ** 2)
    this.distance = Math.sqrt(this.width ** 2 + this.height ** 2)
    this.jellyfishes = []
    this.dusts = []
    this.createElements()
  }

  createElements() {
    const jellyCount = Math.max(10, Math.floor(this.width * this.height * 0.00015))
    const dustCount = Math.max(20, Math.floor(this.width * this.height * 0.0005))
    for (let i = 0; i < jellyCount; i++) this.jellyfishes.push(new Jellyfish(this))
    for (let i = 0; i < dustCount; i++) this.dusts.push(new Dust(this))
  }

  bindEvents() {
    this.container.addEventListener('mousemove', this.onMove)
    this.container.addEventListener('mouseleave', this.onLeave)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.container)
  }

  onMove = (event: MouseEvent) => {
    const offset = this.container.getBoundingClientRect()
    this.destinationX = event.clientX - offset.left
    this.destinationY = event.clientY - offset.top
  }

  onLeave = () => {
    this.destinationX = this.width / 2
    this.destinationY = this.height / 2
  }

  render() {
    this.animationId = requestAnimationFrame(this.render)
    this.x += Math.sign(this.destinationX - this.x) * Math.min(100, Math.abs(this.destinationX - this.x))
    this.y += Math.sign(this.destinationY - this.y) * Math.min(100, Math.abs(this.destinationY - this.y))

    const gradient = this.ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius)
    gradient.addColorStop(0, 'hsl(245, 100%, 50%)')
    gradient.addColorStop(0.3, 'hsl(245, 100%, 30%)')
    gradient.addColorStop(1, 'hsl(245, 100%, 10%)')
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)

    const focus = { x: this.x, y: this.y }
    for (const dust of this.dusts) dust.draw(this.ctx, focus)
    for (const jellyfish of this.jellyfishes) {
      jellyfish.draw(this.ctx, focus)
      jellyfish.update()
    }
  }

  destroy() {
    cancelAnimationFrame(this.animationId)
    this.container.removeEventListener('mousemove', this.onMove)
    this.container.removeEventListener('mouseleave', this.onLeave)
    this.resizeObserver?.disconnect()
  }
}

let renderer: JellyRenderer | null = null

onMounted(() => {
  if (containerRef.value && canvasRef.value) {
    renderer = new JellyRenderer(containerRef.value, canvasRef.value)
    renderer.onLeave()
  }
})

onBeforeUnmount(() => {
  renderer?.destroy()
})
</script>

<style scoped>
.jellyfish-page {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #000;
}

.bg-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.login-box {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 460px;
  min-height: 300px;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.58);
  z-index: 2;
  color: #fff;
  padding: 22px 26px 18px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45);
}

.login-header h1 {
  margin: 0 0 16px;
  color: #fff;
  font-size: 26px;
  font-weight: 500;
  line-height: 1.2;
}

.login-main :deep(.ant-form-item-label > label) {
  color: rgba(255, 255, 255, 0.88);
  font-size: 14px;
}

.login-main :deep(.ant-input),
.login-main :deep(.ant-input-affix-wrapper) {
  background: rgba(255, 255, 255, 0.92);
  border-radius: 2px;
  height: 36px;
}

.login-main :deep(.ant-input-password) {
  padding-top: 0;
  padding-bottom: 0;
}

.form-item {
  margin-bottom: 18px;
}

.login-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 22px;
  color: #fff;
}

.login-btn {
  min-width: 118px;
  height: 34px;
  border-radius: 2px;
  background: #f5f5f5;
  color: #111;
  border-color: #f5f5f5;
}

.login-btn:hover {
  background: #fff;
  color: #111;
  border-color: #fff;
}

.login-main :deep(.ant-checkbox + span) {
  color: rgba(255, 255, 255, 0.92);
}

.login-main :deep(.ant-input-password .ant-input) {
  background: transparent;
}
</style>
