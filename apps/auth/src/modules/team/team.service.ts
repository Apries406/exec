import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Team } from './entities/team.entity';
import { In, Repository } from 'typeorm';
import { CreateTeamDTO } from './dto/create-team.dto';
import { RpcException } from '@nestjs/microservices';
import { createGRPCErrorResponse } from '../../libs/response.lib';
import { User, UserRole } from '../user/entities/user.entity';
import { UpdateTeamDTO } from './dto/update-team.dto';
import { AddTeamMembersDTO } from './dto/add-team-members.dto';

@Injectable()
export class TeamService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createTeam(dto: CreateTeamDTO) {
    const existingTeam = await this.teamRepository.findOne({
      where: { name: dto.name },
    });
    if (existingTeam)
      throw new RpcException(
        createGRPCErrorResponse(
          'TEAM_ALREADY_EXISTS',
          `团队名称「 ${dto.name} 」已存在`,
        ),
      );

    const superAdmin = await this.userRepository.findOne({
      where: { id: dto.super_admin_user_id },
    });

    if (!superAdmin) {
      throw new RpcException(
        createGRPCErrorResponse('USER_NOT_FOUND', '用户不存在'),
      );
    }

    let members: User[] = [];
    if (dto.members.length > 0) {
      members = await this.userRepository.find({
        where: { id: In(dto.members) },
      });

      // 验证是否所有成员都存在
      if (members.length !== dto.members.length) {
        throw new RpcException(
          createGRPCErrorResponse('USER_NOT_FOUND', '一个或多个团队成员不存在'),
        );
      }
    }

    try {
      // 开始事务
      await this.userRepository.manager.transaction(async () => {
        // 创建团队
        const team = this.teamRepository.create({
          name: dto.name,
          description: dto.description,
        });

        const savedTeam = await this.teamRepository.save(team);

        // 设置团队管理员角色和关联的团队（
        superAdmin.role = UserRole.EXTERNAL_SUPER_ADMIN;
        superAdmin.team = savedTeam;
        await this.userRepository.save(superAdmin);

        // 添加成员到团队
        if (members.length > 0) {
          for (const member of members) {
            member.team = savedTeam;
            member.role = UserRole.EXTERNAL_MEMBER; // 默认为团队成员
          }
          await this.userRepository.save(members);
        }

        // 创建成功
        const teamWithMembers = await this.teamRepository.findOne({
          where: { id: savedTeam.id },
          relations: ['members'],
        });

        return {
          success: true,
          message: '团队创建成功',
          data: teamWithMembers,
        };
      });
    } catch (error) {
      // 发生错误，回滚事务
      throw new RpcException(
        createGRPCErrorResponse(
          'CREATE_TEAM_FAILURE',
          (error as Error).message || '创建团队失败',
        ),
      );
    }
  }

  async findAll() {
    return this.teamRepository.find({
      relations: ['members'],
    });
  }

  async findOne(id: string) {
    const team = await this.teamRepository.findOne({
      where: { id },
      relations: ['members'],
    });

    if (!team) {
      throw new RpcException(
        createGRPCErrorResponse('TEAM_NOT_FOUND', '团队未找到'),
      );
    }

    return team;
  }

  async updateTeam(dto: UpdateTeamDTO) {
    const team = await this.teamRepository.findOne({ where: { id: dto.id } });

    if (!team) {
      throw new RpcException(
        createGRPCErrorResponse('TEAM_NOT_FOUND', '团队未找到'),
      );
    }

    if (dto.name && dto.name !== team.name) {
      const existingTeam = await this.teamRepository.findOne({
        where: { name: dto.name },
      });

      if (existingTeam) {
        throw new RpcException(
          createGRPCErrorResponse('TEAM_NAME_EXISTS', '团队名已存在'),
        );
      }
    }

    // 更新团队信息
    if (dto.name) team.name = dto.name;
    if (dto.description !== undefined) team.description = dto.description;
  }

  async deleteTeam(id: string) {
    const team = await this.findOne(id);

    // 先将所有成员从团队中移除（设置team为null）
    for (const member of team.members) {
      member.team = null;
      await this.userRepository.save(member);
    }

    // 删除团队
    await this.teamRepository.remove(team);
  }

  async addTeamMembers(dto: AddTeamMembersDTO) {}

  async removeTeamMember() {}

  async moveUserToAnotherTeam() {}
}
