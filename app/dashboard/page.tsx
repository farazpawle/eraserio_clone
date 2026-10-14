'use client'
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { LogoutLink, useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs"
import { useConvex, useMutation } from "convex/react"
import { useEffect, useState } from "react"
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
    const {user}:any=useKindeBrowserClient()
    const convex=useConvex();
    const router = useRouter();
    const { openNewFileDialog } = useFileManagement();
    const { activeTeam } = useTeam();
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    // Search is now handled by the Header component through FileManagement context
  //const getUser=useQuery(api.user.getUser,{email:user?.email})
  const createUser=useMutation(api.user.createUser);
  
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
        } else {
          console.log('No active team selected');
        }
      },
    },
  ];
  
  useEffect(()=>{
    if(user){
      checkUser();
    }
  },[user])

const checkUser=async()=>{
 const result=await convex.query(api.user.getUser,{email:user?.email})
 if(!result?.length){
    createUser({
      name:user.given_name,
      email:user.email,
      imageUrl:user.picture
    }).then((resp)=>console.log(resp))
  }
}
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
          teamId={activeTeam._id}
          teamName={activeTeam.teamName}
        />
      )}
    </div>
  )
}

export default page