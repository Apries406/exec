export class CreateTeamDTO {
  name: string;
  description: string;
  super_admin_user_id: string;
  members: Array<string> = [];
}
