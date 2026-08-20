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
  const handleInputChange = (field: keyof Header, value: string | number | boolean | undefined) => {
    onChange({ ...header, [field]: value });
  };

  const showIcons = header.iconMode !== 'none';

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="px-3 py-2.5">
        <CardTitle className="text-base">Header</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        <div className="space-y-1">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={header.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="John Doe"
            required
            aria-required="true"
            className="h-8"
            tabIndex={0}
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={header.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="john@example.com"
              required
              aria-required="true"
              className="h-8"
              tabIndex={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={header.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="(123) 456-7890"
              className="h-8"
              tabIndex={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={header.location || ''}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="San Jose, CA"
              className="h-8"
              tabIndex={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="workAuthorization">Work authorization</Label>
            <Input
              id="workAuthorization"
              value={header.workAuthorization || ''}
              onChange={(e) => handleInputChange('workAuthorization', e.target.value)}
              placeholder="e.g., Eligible for CPT"
              className="h-8"
              tabIndex={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              type="url"
              value={header.linkedIn || ''}
              onChange={(e) => handleInputChange('linkedIn', e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
              className="h-8"
              tabIndex={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              type="url"
              value={header.github || ''}
              onChange={(e) => handleInputChange('github', e.target.value)}
              placeholder="https://github.com/johndoe"
              className="h-8"
              tabIndex={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={header.website || ''}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://yoursite.dev"
              className="h-8"
              tabIndex={0}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="blog">Blog</Label>
            <Input
              id="blog"
              type="url"
              value={header.blog || ''}
              onChange={(e) => handleInputChange('blog', e.target.value)}
              placeholder="https://blog.yoursite.dev"
              className="h-8"
              tabIndex={0}
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-1 border-t">
          <Checkbox
            id="useIcons"
            checked={showIcons}
            onCheckedChange={(checked) =>
              handleInputChange('iconMode', checked ? 'icon-and-text' : 'none')
            }
            aria-label="Show icons next to contact info"
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
