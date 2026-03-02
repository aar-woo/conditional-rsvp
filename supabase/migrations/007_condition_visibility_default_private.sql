-- Change default visibility from 'group' to 'private'
alter table rsvps
  alter column condition_visibility set default 'private';
