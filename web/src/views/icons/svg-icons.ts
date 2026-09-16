const modules = import.meta.glob('@/icons/svg/*.svg')

const svgIcons = Object.keys(modules).map((path) =>
  path.split('/').pop()!.replace(/\.svg$/, ''),
)

export default svgIcons