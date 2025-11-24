import express from 'express';
import {
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Hbar,
  AccountCreateTransaction,
  TransferTransaction,
} from '@hashgraph/sdk';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const operatorId = process.env.MY_ACCOUNT_ID;
const operatorKey = process.env.MY_PRIVATE_KEY;
const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);


let REPORT_TOPIC_ID = process.env.HEDERA_TOPIC_ID;

const reports = [];


async function initializeTopic() {
  try {
    if (!REPORT_TOPIC_ID) {
      console.log('Creating new HCS topic...');
      const topicTx = await new TopicCreateTransaction().execute(client);
      const topicReceipt = await topicTx.getReceipt(client);
      REPORT_TOPIC_ID = topicReceipt.topicId.toString();
      console.log('Topic created:', REPORT_TOPIC_ID);
    } else {
      console.log('Using existing topic:', REPORT_TOPIC_ID);
    }
  } catch (error) {
    console.error('Error initializing topic:', error);
  }
}


async function createBurnerAccount() {
  try {
    const burnerKey = PrivateKey.generateED25519();
    
 
    const createAccountTx = await new AccountCreateTransaction()
      .setKey(burnerKey.publicKey)
      .setInitialBalance(new Hbar(2)) 
      .execute(client); 

    const receipt = await createAccountTx.getReceipt(client);
    const burnerAccountId = receipt.accountId.toString();

    return {
      accountId: burnerAccountId,
      privateKey: burnerKey.toStringRaw(),
      publicKey: burnerKey.publicKey.toStringRaw(),
    };
  } catch (error) {
    console.error('Error creating burner account:', error);
    throw error;
  }
}


async function submitReportToHCS(burnerKey, reportData) {
  try {
    const reportMessage = JSON.stringify({
      timestamp: new Date().toISOString(),
      threatType: reportData.threatType,
      location: reportData.location,
      description: reportData.description,
      severity: reportData.severity,
      photoHash: reportData.photoHash || null,
    });

    
    const burnerClient = Client.forTestnet();
    burnerClient.setOperator(reportData.burnerAccountId, PrivateKey.fromString(burnerKey));

    const submitTx = await new TopicMessageSubmitTransaction({
      topicId: REPORT_TOPIC_ID,
      message: reportMessage,
    }).execute(burnerClient);

    const receipt = await submitTx.getReceipt(burnerClient);
    const transactionId = submitTx.transactionId.toString();

    burnerClient.close();

    return {
      success: true,
      transactionId: transactionId,
      sequenceNumber: receipt.topicSequenceNumber.toString(),
      runningHash: receipt.topicRunningHash.toString(),
    };
  } catch (error) {
    console.error('Error submitting to HCS:', error);
    throw error;
  }
}


app.post('/api/reports/anonymous', async (req, res) => {
  try {
    const { threatType, location, description, severity, photoHash } = req.body;

   
    if (!threatType || !location || !description) {
      return res.status(400).json({
        error: 'Missing required fields: threatType, location, description',
      });
    }

    const validThreats = ['deforestation', 'illegal_logging', 'fire', 'encroachment', 'poaching', 'other'];
    if (!validThreats.includes(threatType)) {
      return res.status(400).json({
        error: `Invalid threat type. Must be one of: ${validThreats.join(', ')}`,
      });
    }

    console.log('Creating burner account for anonymous report...');
    const burnerAccount = await createBurnerAccount();

    const reportData = {
      threatType,
      location,
      description,
      severity: severity || 'medium',
      photoHash,
      burnerAccountId: burnerAccount.accountId,
    };

    console.log('Submitting report to HCS...');
    const hcsResult = await submitReportToHCS(burnerAccount.privateKey, reportData);

    const reportRecord = {
      id: hcsResult.transactionId,
      threatType,
      location,
      description,
      severity: reportData.severity,
      photoHash,
      timestamp: new Date().toISOString(),
      burnerAccountId: burnerAccount.accountId,
      sequenceNumber: hcsResult.sequenceNumber,
    };
    reports.push(reportRecord);

    res.json({
      success: true,
      message: 'Report submitted anonymously',
      transactionId: hcsResult.transactionId,
      sequenceNumber: hcsResult.sequenceNumber,
      runningHash: hcsResult.runningHash,
      note: 'Your report is immutable and tamper-proof on Hedera HCS. No personal information was recorded.',
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      error: 'Failed to submit anonymous report',
      details: error.message,
    });
  }
});


app.get('/api/reports/admin', async (req, res) => {
  try {
   
    const adminKey = req.headers['x-admin-key'];

    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.json({
      success: true,
      totalReports: reports.length,
      reports: reports.map((r) => ({
        id: r.id,
        threatType: r.threatType,
        severity: r.severity,
        location: r.location,
        description: r.description,
        timestamp: r.timestamp,
        sequenceNumber: r.sequenceNumber,
        immutableOnHedera: true,
      })),
      topicId: REPORT_TOPIC_ID,
    });
  } catch (error) {
    console.error('Error retrieving reports:', error);
    res.status(500).json({
      error: 'Failed to retrieve reports',
      details: error.message,
    });
  }
});


app.get('/api/reports/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const report = reports.find((r) => r.id === transactionId);

    if (!report) {
      return res.status(404).json({
        error: 'Report not found',
        transactionId: transactionId,
      });
    }

    res.json({
      success: true,
      report: report,
      verified: 'This report is recorded on Hedera HCS and is immutable',
    });
  } catch (error) {
    console.error('Error retrieving report:', error);
    res.status(500).json({
      error: 'Failed to retrieve report',
      details: error.message,
    });
  }
});


app.get('/api/reports/stats/threats', async (req, res) => {
  try {
    const threatCounts = {};
    const severityCounts = { low: 0, medium: 0, high: 0, critical: 0 };

    reports.forEach((r) => {
      threatCounts[r.threatType] = (threatCounts[r.threatType] || 0) + 1;
      severityCounts[r.severity] = (severityCounts[r.severity] || 0) + 1;
    });

    res.json({
      success: true,
      totalReports: reports.length,
      byThreatType: threatCounts,
      bySeverity: severityCounts,
      topicId: REPORT_TOPIC_ID,
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      details: error.message,
    });
  }
});


app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'LindaMisitu Anonymous Reporting Service',
    hederaNetworkStatus: 'connected',
    reportTopicId: REPORT_TOPIC_ID,
    totalReportsSubmitted: reports.length,
  });
});

const PORT = process.env.PORT || 3001;


(async () => {
  try {
    await initializeTopic();
    app.listen(PORT, () => {
      console.log(`\nLindaMisitu Anonymous Reporting Service running on port ${PORT}`);
      console.log(`Report Topic ID: ${REPORT_TOPIC_ID}`);
      console.log(`All reports are immutable and anonymous on Hedera HCS\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();