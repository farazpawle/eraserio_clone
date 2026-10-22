'use client'
import { Button } from "@/components/ui/button"
import { useState } from "react"
import Header from "./_components/Header"
import FileList from "./_components/FileList"
import { BreadcrumbItem } from "@/components/ui/breadcrumb"
import { FloatingActionButton } from "@/components/ui/floating-action-button"
import { FileText, Users } from "lucide-react"
import { useRouter } from "next/navigation"
import { useFileManagement } from "@/app/_context/FileManagementContext"
import { useTeam } from "@/app/_context/TeamContext"
import TeamInvitationModal from "@/components/ui/team-invitation-modal"

const page = () => {
    const router = useRouter();
    const { openNewFileDialog } = useFileManagement();
    const { activeTeam } = useTeam();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    // Search is now handled by the Header component through FileManagement context
  
  // Define breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', isCurrentPage: true }
  ];
  
  // Define floating action button items
  const fabItems = [
    {
      id: 'new-file',
      label: 'New Project',
      icon: FileText,
      onClick: () => {
        // Properly trigger new file creation using context
        openNewFileDialog();
      },
    },
    {
      id: 'invite-team',
      label: 'Invite Team',
      icon: Users,
      onClick: () => {
        if (activeTeam) {
          setIsInviteModalOpen(true);
        }
      },
    },
  ];
  
  return (
    <div className="p-8 bg-white dark:bg-gray-900 min-h-screen relative">
      <Header breadcrumbItems={breadcrumbItems} />

      <FileList />
      
      {/* Floating Action Button */}
      <FloatingActionButton 
        items={fabItems}
        position="bottom-right"
        variant="primary"
      />
      
      {/* Team Invitation Modal */}
      {activeTeam && (
        <TeamInvitationModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          teamId={activeTeam.id}
          teamName={activeTeam.name}
        />
      )}
    </div>
  )
}

export default page