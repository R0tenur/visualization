SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

SET ANSI_PADDING ON
GO

CREATE TABLE [dbo].[<name>](
  [pkid]   [int] NOT NULL,
  [num1] [int] NOT NULL,
  [num2] [int] NOT NULL,
  [num3] [int] NULL,
  [st] [varchar](100) NULL,
  PRIMARY KEY (pkid)
) ON [PRIMARY]

GO

SET ANSI_PADDING OFF
GO