<script lang="ts">
import { defineComponent, h } from "vue";
import { HomeOutlined, SettingOutlined, UserOutlined } from "@ant-design/icons-vue";

const iconMap = {
  home: HomeOutlined,
  setting: SettingOutlined,
  user: UserOutlined,
};

export default defineComponent({
  name: "MenuItem",
  props: {
    icon: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
  },
  setup(props) {
    return () => {
      const children = [];

      const Icon = iconMap[props.icon as keyof typeof iconMap];
      if (Icon) {
        children.push(h(Icon, { class: "menu-item-icon" }));
      } else {
        
      }

      if (props.title) {
        children.push(h("span", props.title));
      }

      return children;
    };
  },
});
</script>

<style scoped>
.menu-item-icon {
  margin-right: 10px;
  font-size: 16px;
}
</style>