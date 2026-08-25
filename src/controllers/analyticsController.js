const mongoose = require('mongoose');
const ApiRequestLog = require('../models/ApiRequestLog');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const parseDate = (str, fieldName) => {
  if (!DATE_RE.test(str)) return { error: `Invalid date format for '${fieldName}': use YYYY-MM-DD` };
  const d = new Date(str);
  if (isNaN(d.getTime())) return { error: `Invalid date value for '${fieldName}'` };
  return { date: d };
};

const getAnalytics = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    let from, toExclusive, periodTo;

    if (req.query.from || req.query.to) {
      if (!req.query.from || !req.query.to) {
        return res.status(400).json({ status: 'error', message: "Both 'from' and 'to' are required when filtering by date" });
      }

      const parsedFrom = parseDate(req.query.from, 'from');
      if (parsedFrom.error) return res.status(400).json({ status: 'error', message: parsedFrom.error });

      const parsedTo = parseDate(req.query.to, 'to');
      if (parsedTo.error) return res.status(400).json({ status: 'error', message: parsedTo.error });

      from = parsedFrom.date;
      periodTo = parsedTo.date;

      if (from > periodTo) {
        return res.status(400).json({ status: 'error', message: "'from' must not be after 'to'" });
      }

      toExclusive = new Date(periodTo);
      toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    } else {
      const now = new Date();
      toExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      from = new Date(toExclusive);
      from.setUTCDate(from.getUTCDate() - 30);
      periodTo = new Date(toExclusive);
      periodTo.setUTCDate(periodTo.getUTCDate() - 1);
    }

    const [result] = await ApiRequestLog.aggregate([
      {
        $match: {
          project: new mongoose.Types.ObjectId(projectId),
          createdAt: { $gte: from, $lt: toExclusive },
        },
      },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                successfulRequests: {
                  $sum: { $cond: [{ $and: [{ $gte: ['$statusCode', 200] }, { $lt: ['$statusCode', 400] }] }, 1, 0] },
                },
                failedRequests: {
                  $sum: { $cond: [{ $gte: ['$statusCode', 400] }, 1, 0] },
                },
                totalResponseTime: { $sum: '$responseTime' },
              },
            },
            {
              $project: {
                _id: 0,
                totalRequests: 1,
                successfulRequests: 1,
                failedRequests: 1,
                successRate: {
                  $cond: [
                    { $eq: ['$totalRequests', 0] },
                    0,
                    { $round: [{ $multiply: [{ $divide: ['$successfulRequests', '$totalRequests'] }, 100] }, 2] },
                  ],
                },
                averageResponseTime: {
                  $cond: [
                    { $eq: ['$totalRequests', 0] },
                    0,
                    { $round: [{ $divide: ['$totalResponseTime', '$totalRequests'] }, 2] },
                  ],
                },
              },
            },
          ],
          byMethod: [
            { $group: { _id: '$method', requests: { $sum: 1 } } },
            { $sort: { requests: -1 } },
            { $project: { _id: 0, method: '$_id', requests: 1 } },
          ],
          byStatus: [
            { $group: { _id: '$statusCode', requests: { $sum: 1 } } },
            { $sort: { requests: -1 } },
            { $project: { _id: 0, statusCode: '$_id', requests: 1 } },
          ],
          topEndpoints: [
            { $group: { _id: '$endpoint', requests: { $sum: 1 } } },
            { $sort: { requests: -1 } },
            { $limit: 10 },
            { $project: { _id: 0, endpoint: '$_id', requests: 1 } },
          ],
        },
      },
    ]);

    const emptySummary = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      successRate: 0,
      averageResponseTime: 0,
    };

    res.status(200).json({
      status: 'ok',
      data: {
        period: {
          from: from.toISOString(),
          to: periodTo.toISOString(),
        },
        summary: result.summary[0] ?? emptySummary,
        byMethod: result.byMethod,
        byStatus: result.byStatus,
        topEndpoints: result.topEndpoints,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAnalytics };
