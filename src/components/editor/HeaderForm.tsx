'use client';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/types/resume';

interface HeaderFormProps {
  header: Header;
  onChange: (header: Header) => void;
}

export const HeaderForm = ({ header, onChange }: HeaderFormProps) => {
  const handleInputChange = (field: keyof Header, value: string | boolean) => {
    onChange({ ...header, [field]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Header</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={header.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="John Doe"
            aria-label="Full name"
            tabIndex={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={header.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="john@example.com"
            aria-label="Email address"
            tabIndex={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={header.phone || ''}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="(123) 456-7890"
            aria-label="Phone number"
            tabIndex={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            type="url"
            value={header.linkedIn || ''}
            onChange={(e) => handleInputChange('linkedIn', e.target.value)}
            placeholder="https://linkedin.com/in/johndoe"
            aria-label="LinkedIn URL"
            tabIndex={0}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="github">GitHub</Label>
          <Input
            id="github"
            type="url"
            value={header.github || ''}
            onChange={(e) => handleInputChange('github', e.target.value)}
            placeholder="https://github.com/johndoe"
            aria-label="GitHub URL"
            tabIndex={0}
          />
        </div>

        <div className="flex items-center space-x-2 pt-2 border-t">
          <Checkbox
            id="useIcons"
            checked={header.useIcons ?? true}
            onCheckedChange={(checked) =>
              handleInputChange('useIcons', checked as boolean)
            }
            aria-label="Use icons in header"
            tabIndex={0}
          />
          <Label htmlFor="useIcons" className="cursor-pointer text-sm">
            Show icons next to contact info
          </Label>
        </div>
      </CardContent>
    </Card>
  );
};
