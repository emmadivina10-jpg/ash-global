import {createFileRoute} from '@tanstack/react-router';
export const Route=createFileRoute('/api/staff-member-ai')({server:{handlers:{POST:async({request})=>{const {handleMemberChat}=await import('@/lib/staff-ai/member-chat.server');return handleMemberChat(request);}}}});
