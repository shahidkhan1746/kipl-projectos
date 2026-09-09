class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String? employeeId;
  final String? designation;
  final String? projectId;

  const UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.employeeId,
    this.designation,
    this.projectId,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: (json['role'] as String? ?? 'user').toLowerCase(),
      employeeId: json['employeeId'] as String?,
      designation: json['designation'] as String?,
      projectId: json['projectId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'role': role,
        'employeeId': employeeId,
        'designation': designation,
        'projectId': projectId,
      };

  bool get isAdmin => role == 'admin' || role == 'super_admin';
  bool get isProjectManager => role == 'project_manager' || isAdmin;
  bool get isEngineer =>
      role == 'site_engineer' || role == 'engineer' || isProjectManager;
  bool get isSupervisor =>
      role == 'site_supervisor' || role == 'supervisor' || isEngineer;
  bool get canManageSiteOrders => isEngineer || role == 'liaison_officer';
  bool get canManageQuality => isEngineer || role == 'qa_engineer';
  bool get canManageFieldOperations => isSupervisor;

  String get roleDisplay {
    switch (role) {
      case 'admin':
      case 'super_admin':
        return 'System Administrator';
      case 'project_manager':
        return 'Project Manager';
      case 'site_engineer':
        return 'Site Engineer';
      case 'site_supervisor':
        return 'Site Supervisor';
      case 'qa_engineer':
        return 'QA / QC Engineer';
      case 'liaison_officer':
        return 'Liaison Officer';
      case 'accountant':
        return 'Site Accountant';
      default:
        return role.replaceAll('_', ' ').toUpperCase();
    }
  }
}
