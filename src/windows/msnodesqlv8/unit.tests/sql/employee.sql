SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [<name>](
  [BusinessEntityID] [int] NOT NULL,
  [NationalIDNumber] [nvarchar](15) NOT NULL,
  [LoginID] [nvarchar](256) NOT NULL,
  [OrganizationNode] [hierarchyid] NULL,
  [OrganizationLevel]  AS ([OrganizationNode].[GetLevel]()),
  [JobTitle] [nvarchar](50) NOT NULL,
  [BirthDate] [date] NOT NULL,
  [MaritalStatus] [nchar](1) NOT NULL,
  [Gender] [nchar](1) NOT NULL,
  [HireDate] [date] NOT NULL,
  [SalariedFlag] [bit] NOT NULL,
  [VacationHours] [smallint] NOT NULL,
  [SickLeaveHours] [smallint] NOT NULL,
  [CurrentFlag] [bit] NOT NULL,
  [rowguid] [uniqueidentifier] ROWGUIDCOL  NOT NULL,
  [ModifiedDate] [datetime] NOT NULL,
  CONSTRAINT [PK_Employee_BusinessEntityID] PRIMARY KEY CLUSTERED
    (
      [BusinessEntityID] ASC
    )WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON) ON [PRIMARY]
) ON [PRIMARY]

GO

ALTER TABLE [<name>] ADD  CONSTRAINT [DF_Employee_SalariedFlag]  DEFAULT ((1)) FOR [SalariedFlag]
GO

ALTER TABLE [<name>] ADD  CONSTRAINT [DF_Employee_VacationHours]  DEFAULT ((0)) FOR [VacationHours]
GO

ALTER TABLE [<name>] ADD  CONSTRAINT [DF_Employee_SickLeaveHours]  DEFAULT ((0)) FOR [SickLeaveHours]
GO

ALTER TABLE [<name>] ADD  CONSTRAINT [DF_Employee_CurrentFlag]  DEFAULT ((1)) FOR [CurrentFlag]
GO

ALTER TABLE [<name>] ADD  CONSTRAINT [DF_Employee_rowguid]  DEFAULT (newid()) FOR [rowguid]
GO

ALTER TABLE [<name>] ADD  CONSTRAINT [DF_Employee_ModifiedDate]  DEFAULT (getdate()) FOR [ModifiedDate]
GO

ALTER TABLE [<name>]  WITH CHECK ADD  CONSTRAINT [CK_Employee_BirthDate] CHECK  (([BirthDate]>='1930-01-01' AND [BirthDate]<=dateadd(year,(-18),getdate())))
GO

ALTER TABLE [<name>] CHECK CONSTRAINT [CK_Employee_BirthDate]
GO

ALTER TABLE [<name>]  WITH CHECK ADD  CONSTRAINT [CK_Employee_Gender] CHECK  ((upper([Gender])='F' OR upper([Gender])='M'))
GO

ALTER TABLE [<name>] CHECK CONSTRAINT [CK_Employee_Gender]
GO

ALTER TABLE [<name>]  WITH CHECK ADD  CONSTRAINT [CK_Employee_HireDate] CHECK  (([HireDate]>='1996-07-01' AND [HireDate]<=dateadd(day,(1),getdate())))
GO

ALTER TABLE [<name>] CHECK CONSTRAINT [CK_Employee_HireDate]
GO

ALTER TABLE [<name>]  WITH CHECK ADD  CONSTRAINT [CK_Employee_MaritalStatus] CHECK  ((upper([MaritalStatus])='S' OR upper([MaritalStatus])='M'))
GO

ALTER TABLE [<name>] CHECK CONSTRAINT [CK_Employee_MaritalStatus]
GO

ALTER TABLE [<name>]  WITH CHECK ADD  CONSTRAINT [CK_Employee_SickLeaveHours] CHECK  (([SickLeaveHours]>=(0) AND [SickLeaveHours]<=(120)))
GO

ALTER TABLE [<name>] CHECK CONSTRAINT [CK_Employee_SickLeaveHours]
GO

ALTER TABLE [<name>]  WITH CHECK ADD  CONSTRAINT [CK_Employee_VacationHours] CHECK  (([VacationHours]>=(-40) AND [VacationHours]<=(240)))
GO

ALTER TABLE [<name>] CHECK CONSTRAINT [CK_Employee_VacationHours]
GO
