import type { ThemeConfig } from 'antd'

/**
 * The one Ant Design theme for the whole app, tuned to the LMS Content look: Kanvas purple, soft lilac
 * borders, small uppercase table headers, rounded inputs. Applied once in main.tsx via <ConfigProvider>.
 */
export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#5c2d91',
    colorLink: '#5c2d91',
    colorLinkHover: '#7b3fa0',
    colorLinkActive: '#4a2375',
    colorText: '#1a1228',
    colorTextSecondary: '#7b6b94',
    colorTextTertiary: '#9b87b5',
    colorBorder: '#ede8f5',
    colorBorderSecondary: '#ede8f5',
    colorBgLayout: '#f7f6fc',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  },
  components: {
    Table: {
      headerBg: '#fdfcff',
      headerColor: '#9b87b5',
      headerSplitColor: 'transparent',
      borderColor: '#ede8f5',
      rowHoverBg: '#faf8fe',
      cellPaddingBlock: 12,
      cellPaddingInline: 20,
      fontSize: 12,
    },
    Input: { colorBgContainer: '#ffffff' },
    InputNumber: { colorBgContainer: '#ffffff' },
    Select: { colorBgContainer: '#ffffff' },
    Segmented: { itemSelectedBg: '#5c2d91', itemSelectedColor: '#ffffff', trackBg: 'transparent', trackPadding: 0 },
    Modal: { headerBg: '#ffffff', titleFontSize: 16 },
    Tag: { defaultBg: '#f5f4f8', defaultColor: '#3d2260' },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#7b6b94',
      itemHoverBg: '#faf8fd',
      itemHoverColor: '#5c2d91',
      itemSelectedBg: '#f5effe',
      itemSelectedColor: '#5c2d91',
      itemBorderRadius: 10,
      itemHeight: 42,
      itemMarginInline: 0,
      itemMarginBlock: 2,
      activeBarBorderWidth: 0,
    },
    Layout: { headerBg: '#ffffff', siderBg: '#ffffff', bodyBg: '#f7f6fc' },
    Tabs: { titleFontSize: 14, horizontalItemGutter: 28 },
  },
}
