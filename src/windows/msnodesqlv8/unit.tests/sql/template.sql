SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[<name>](
  [ID] [int] NOT NULL,
  [c1] [nvarchar](100) NOT NULL,
  [c2] [nvarchar](100) NOT NULL,
  [c3] [date] NOT NULL,
  [c4] [date] NOT NULL,
  [c5] [bit] NOT NULL,
  [c6] [int] NOT NULL,
  [c7] [int] NOT NULL,
  [c8] [int] NOT NULL,
  [c9] [int] NOT NULL,
  [c10] [bit] NOT NULL,
  [c11] [decimal](18, 4) NOT NULL,
  [c12] [decimal](18, 4) NOT NULL,
  PRIMARY KEY ([ID])
) ON [PRIMARY]

GO
