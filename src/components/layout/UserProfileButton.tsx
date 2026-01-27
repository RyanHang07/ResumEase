'use client';

import { useUser, useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const UserProfileButton = () => {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();

  const displayName = user?.fullName || user?.firstName || user?.emailAddresses[0]?.emailAddress || 'User';
  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.firstName
      ? user.firstName[0].toUpperCase()
      : 'U';

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleOpenProfile = () => {
    openUserProfile();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="User profile menu"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <span className="max-w-[120px] truncate">{displayName}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt={displayName}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium truncate">{displayName}</span>
              {user?.emailAddresses[0]?.emailAddress && (
                <span className="text-xs text-muted-foreground truncate">
                  {user.emailAddresses[0].emailAddress}
                </span>
              )}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={handleOpenProfile}
        >
          <User className="h-4 w-4 mr-2" />
          <span>Manage Account</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
