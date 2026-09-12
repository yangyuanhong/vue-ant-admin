import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'

const WIDTH = 992

export default function useResizeHandler() {
	const route = useRoute()
	const appStore = useAppStore()

	const isMobile = () => document.body.getBoundingClientRect().width - 1 < WIDTH

	const resizeHandler = () => {
		if (document.hidden) return

		const mobile = isMobile()
		appStore.toggleDevice(mobile ? 'mobile' : 'desktop')

		if (mobile) appStore.closeSideBar(true)
	}

	watch(
		() => route.fullPath,
		() => {
			if (appStore.device === 'mobile' && appStore.sidebar.opened) {
        appStore.closeSideBar(false)
			}
		}
	)

	onMounted(() => {
		window.addEventListener('resize', resizeHandler)
		resizeHandler()
	})

	onBeforeUnmount(() => {
		window.removeEventListener('resize', resizeHandler)
	})
}
