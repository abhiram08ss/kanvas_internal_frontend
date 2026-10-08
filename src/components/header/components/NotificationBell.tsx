import { Badge, Button } from 'antd'
import { Bell } from 'lucide-react'

export function NotificationBell() {
  return (
    <Badge dot>
      <Button shape="circle" aria-label="Notifications" icon={<Bell size={16} />} />
    </Badge>
  )
}
